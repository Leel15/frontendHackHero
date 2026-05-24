import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import MakerSingleLayout from '../layouts/MakerSingleLayout';
import MakerMultiLayout from '../layouts/MakerMultiLayout'; 
import { socket } from '../../../../socket';
import { BASE_URL } from '../../../../api/auth.js';
import GameOverOverlay from '../../../GameOverOverlay.js';

interface PasswordProps {
    gameId: string;
    sessionId: string;
    initialLevel: number;
    userData: any;
    navigate: any;
    mode?: string;
    initialRole?: 'maker' | 'breaker';
    onFinish: (results: any) => void;
}

const MakerController: React.FC<PasswordProps> = ({ gameId, sessionId, initialLevel, userData, navigate, mode, onFinish }) => {

    // --- States المشتركة والخاصة بالوضع الفردي ---
    const [password, setPassword] = useState('');
    const [strength, setStrength] = useState(0);
    const [isAlertActive, setIsAlertActive] = useState(false);
    const [aiRecommendation, setAiRecommendation] = useState('');
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
    const [displayedText, setDisplayedText] = useState("");
    const [gameStatus, setGameStatus] = useState<'Win' | 'Loss' | null>(null);
    const [timeLeft, setTimeLeft] = useState(200);
    const [lives, setLives] = useState(3);
    const [loading, setLoading] = useState(false);

    // --- States الخاصة بالتحكم بالـ GameOverOverlay التفاعلي ---
    const [showProceedBtn, setShowProceedBtn] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayData, setOverlayData] = useState({
        isWinner: false,
        title: "",
        message: "",
        xpGained: 0
    });

    // --- States الخاصة بالوضع الجماعي (Multiplayer Dossier) ---
    const [targetName, setTargetName] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [city, setCity] = useState('');
    const [pet, setPet] = useState('');
    const [hint, setHint] = useState('');
    const [isDeployed, setIsDeployed] = useState(false); 
    const [attackLogs, setAttackLogs] = useState<{ guess: string, isCorrect: boolean, time: string }[]>([]); 

    const typeAudioRef = useRef(new Audio('/sounds/type.mp3'));
    const handleKeyPress = () => {
        typeAudioRef.current.currentTime = 0;
        typeAudioRef.current.play().catch(() => { });
    };

    // عداد الوقت التناقسي
    useEffect(() => {
        if (timeLeft <= 0 || gameStatus !== null) {
            if (timeLeft <= 0 && gameStatus === null) {
                setGameStatus('Loss');
                Swal.fire({
                    title: '<span style="color:#ef4444; font-family:monospace; font-weight:900;">TIME_EXPIRED ⏳</span>',
                    text: "Security mainframe lockdown! You ran out of time.",
                    icon: "error",
                    background: "#080c14",
                    color: "#fff",
                    confirmButtonColor: "#ef4444",
                    confirmButtonText: "EXIT SIMULATOR"
                }).then(() => {
                    onFinish({ status: 'Loss', score: 0, duration: 60 });
                });
            }
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, gameStatus]);

    // حساب قوة كلمة المرور في الوقت الفعلي
    useEffect(() => {
        let s = 0;
        if (password.length >= 10) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[a-z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        setStrength(s);
    }, [password]);

    // تأثير الطباعة التلقائي لكونسول النصائح
    useEffect(() => {
        if (!isAiAnalyzing && aiRecommendation) {
            setDisplayedText("");
            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < aiRecommendation.length) {
                    setDisplayedText(aiRecommendation.substring(0, i + 1));
                    i++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 30);
            return () => clearInterval(typingInterval);
        }
    }, [aiRecommendation, isAiAnalyzing]);

    // استماع تخمينات الأونلاين للوضع الجماعي
    useEffect(() => {
        if (mode !== 'multiplayer') return;

        const handleBreakerAttempt = (data: any) => {
            const newLog = {
                guess: data.guess,
                isCorrect: data.isCorrect,
                time: new Date().toLocaleTimeString([], { hour12: false }) 
            };
            setAttackLogs(prev => [newLog, ...prev]);
        };

        socket.on("receive_breaker_guess", handleBreakerAttempt);
        return () => {
            socket.off("receive_breaker_guess", handleBreakerAttempt);
        };
    }, [mode]);

    const handleMultiplayerDeploy = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        const missionData = {
            sessionId,
            password,
            dossier: { name: targetName, birthYear, city, pet, hint }
        };

        if (!socket.connected) {
            socket.connect();
            setTimeout(() => {
                socket.emit("join_room", sessionId);
                socket.emit("send_password", missionData);
                setLoading(false);
                setIsDeployed(true);
            }, 500);
        } else {
            socket.emit("send_password", missionData);
            setLoading(false);
            setIsDeployed(true);
        }
    };

    // ⚔️ الدالة الذكية للتحقق وتشغيل زر علم بوسط الشاشة
    const handleMakerSubmit = async () => {
        if (password.length < 6) return;

        setIsAlertActive(false);
        setLoading(true); 
        setIsAiAnalyzing(true); 
        setShowProceedBtn(false);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${BASE_URL}/games/password/evaluate`, {
                password,
                gameId,
                duration: 60 - timeLeft,
                level: initialLevel
            }, { headers: { Authorization: `Bearer ${token}` } });

            const { status, hackerReaction, recommendation, simulationDelay, pointsEarned } = res.data;

            setTimeout(() => {
                setIsAiAnalyzing(false);
                setLoading(false);
                setAiRecommendation(recommendation); 

                // شحن بيانات الأوفرلاي بالخلفية لانتظار ضغطة اللاعب
                setOverlayData({
                    isWinner: status === "Win",
                    title: status === "Win" ? "FIREWALL_UNBREACHABLE 🛡️" : "FIREWALL_BYPASSED 🕵️‍♂️",
                    message: status === "Win" ? hackerReaction : `${hackerReaction} \n\n Directive: ${recommendation}`,
                    xpGained: status === "Win" ? pointsEarned : 0
                });

                if (status === "Loss") {
                    setIsAlertActive(true); 
                    setLives(prev => {
                        const updatedLives = prev - 1;
                        // حتى لو خسر محاولة، نخليه يضغط العلم بوسط الشاشة أولاً ليقرأ التقرير
                        setShowProceedBtn(true);
                        return updatedLives;
                    });
                } else if (status === "Win") {
                    setGameStatus("Win");
                    setShowProceedBtn(true); // تفعيل زر علم لقراءة الرد الفائز
                }

            }, simulationDelay); 

        } catch (e) {
            setIsAiAnalyzing(false);
            setLoading(false);
            setAiRecommendation("CRITICAL_ERROR: INTERNAL_SECURITY_LINK_SEVERED.");
        }
    };

    // 🔄 الضغط على زر علم [ Acknowledge_Report ] بوسط الشاشة
    const handleMainAcknowledge = () => {
        setShowProceedBtn(false);
        setShowOverlay(true); // تشغيل شاشة الأوفرلاي لعداد الـ XP الكبرى!
    };

    // الإغلاق النهائي للأوفرلاي والتحويل للجولة التالية
    const handleOverlayClose = () => {
        setShowOverlay(false);
        
        // التحقق لو قلوبه قضت تماماً عند الخسارة
        const finalStatus = overlayData.isWinner ? 'Win' : 'Loss';
        const finalScore = overlayData.isWinner ? overlayData.xpGained : 0;
        
        onFinish({
            status: finalStatus,
            score: finalScore,
            duration: 60 - timeLeft
        });

        if (typeof navigate === 'function') {
            navigate('/games');
        } else {
            window.location.href = '/games';
        }
    };

    return (
        <>
            {mode === 'multiplayer' ? (
                <MakerMultiLayout
                    targetName={targetName} setTargetName={setTargetName}
                    birthYear={birthYear} setBirthYear={setBirthYear}
                    city={city} setCity={setCity}
                    pet={pet} setPet={setPet}
                    hint={hint} setHint={setHint}
                    handleKeyPress={handleKeyPress}
                    password={password} setPassword={setPassword}
                    handleDeploy={handleMultiplayerDeploy}
                    loading={loading}
                    isAlertActive={isAlertActive}
                    isDeployed={isDeployed}
                    attackLogs={attackLogs}
                />
            ) : (
                <MakerSingleLayout
                    password={password} setPassword={setPassword}
                    strength={strength} isVulnerable={strength < 5}
                    handleKeyPress={handleKeyPress}
                    isAlertActive={isAlertActive} isAiAnalyzing={isAiAnalyzing}
                    displayedText={displayedText} aiRecommendation={aiRecommendation}
                    loading={loading} timeLeft={timeLeft} lives={lives}
                    initialLevel={initialLevel} handleMakerSubmit={handleMakerSubmit}
                    handleReset={() => setPassword('')}
                    showProceedBtn={showProceedBtn}
                    onMainAcknowledge={handleMainAcknowledge}
                    gameStatus={gameStatus}
                />
            )}

            {/* 🚨 إضافة الأوفرلاي هنا ليظهر في كائن الـ DOM بشكل منبثق فخم */}
            {showOverlay && (
                <GameOverOverlay
                    isWinner={overlayData.isWinner}
                    title={overlayData.title}
                    message={overlayData.message}
                    xpGained={overlayData.xpGained}
                    role="maker"
                    onClose={handleOverlayClose}
                />
            )}
        </>
    );
};

export default MakerController;