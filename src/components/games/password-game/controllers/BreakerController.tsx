import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { socket } from '../../../../socket'; // تأكدي من مسار السوكيت
import BreakerLayout from '../layouts/BreakerLayout'; // تأكدي من مسار واجهة البريكر
import { BASE_URL } from '../../../../api/auth.js';

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

const BreakerController: React.FC<PasswordProps> = ({ gameId, sessionId, initialLevel, userData, navigate, mode, onFinish }) => {
    // State Management
    const [timeLeft, setTimeLeft] = useState(200);
    const [lives, setLives] = useState(3);
    const [breakerData, setBreakerData] = useState<any>(null);
    const [challengeId, setChallengeId] = useState<string | null>(null);
    const [breakerInput, setBreakerInput] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAnswered, setIsAnswered] = useState(false);
    const [displayedAnalysis, setDisplayedAnalysis] = useState("");
    
    // Multiplayer State
    const [isWaitingForMaker, setIsWaitingForMaker] = useState(mode === 'multiplayer');
    const [correctAnswerFromServer, setCorrectAnswerFromServer] = useState<string | null>(null);

    const playSuccessSound = () => new Audio('/sounds/success.mp3').play().catch(()=>{});
    const playErrorSound = () => new Audio('/sounds/alarm.mp3').play().catch(()=>{});
    const typeAudioRef = useRef(new Audio('/sounds/type.mp3'));
    const handleKeyPress = () => {
        typeAudioRef.current.currentTime = 0;
        typeAudioRef.current.play().catch(() => {});
    };
    const [isAlertActive, setIsAlertActive] = useState(false);



    // 1. التايمر (Timer)
    useEffect(() => {
        let timer: any;
        if (timeLeft > 0 && lives > 0 && !isWaitingForMaker) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }

        if (timeLeft === 0) {
            // if (mode === 'multiplayer') {
            //     socket.emit('game_over', { sessionId, winner: 'maker' });
            // }
            handleFinishGame('Loss');
        }

        if (lives === 0) {
            // if (mode === 'multiplayer') {
            //     socket.emit('game_over', { sessionId, winner: 'maker' });
            // }

            handleFinishGame('Loss');
        }

        return () => clearInterval(timer);
    }, [timeLeft, lives, isWaitingForMaker]);

    // 2. تأثير الكتابة (Typing Effect)
    const typeEffect = (fullText: string) => {
        setDisplayedAnalysis("");
        let i = 0;
        const interval = setInterval(() => {
            if (i < fullText.length) {
                setDisplayedAnalysis(fullText.substring(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 30);
    };

    // 3. أ - تهيئة بيانات السنقل بلاير (فقط إذا لم نكن في وضع الملتي بلاير)
    useEffect(() => {
        if (mode !== 'multiplayer') {
            const initSinglePlayer = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const isTechnical = userData?.isTechnical || false;
                    const res = await axios.post(`${BASE_URL}/games/password/init-breaker`, {
                        gameId, level: initialLevel, isTechnical, excludeIds: []
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    if (res.data.success) {
                        const { data, challengeId } = res.data;
                        setBreakerData(data);
                        setChallengeId(challengeId);
                        typeEffect(data.analysis_report);
                        setIsWaitingForMaker(false);
                    }
                } catch (e) {
                    Swal.fire("Error", "Could not fetch intelligence data", "error");
                }
            };
            initSinglePlayer();
        }
    }, [mode, gameId, initialLevel]);

    // 3. ب - استماع السوكيت للملتي بلاير (في useEffect مستقل وثابت)
    useEffect(() => {
        if (mode !== 'multiplayer') return;

        // تعريف دالة الاستلام
        const handleReceivePassword = (data: any) => {
            console.log("🔥 Mission Data received from Maker:", data);
            
            // 1. تحديث الكلمة الصحيحة
            setCorrectAnswerFromServer(data.password);

            // 2. تحديث بيانات الضحية (التأكد من إنشاء كائن جديد تماماً)
            const newDossier = {
                userData: { 
                    name: data.dossier?.name || "UNKNOWN_SUBJECT", 
                    birthYear: data.dossier?.birthYear || "----", 
                    city: data.dossier?.city || "UNKNOWN", 
                    pet: data.dossier?.pet || "NONE", 
                    hobby: "CLASSIFIED" 
                }
            };
            setBreakerData(newDossier);

            // 3. عرض التلميح بتأثير الطباعة
            typeEffect(data.dossier?.hint || "No communication intercepted.");
            
            // 4. إنهاء حالة الانتظار وعرض إشعار
            setIsWaitingForMaker(false);
            
           
        };

        // تسجيل الحدث
        console.log("👂 Breaker is now listening for 'receive_password'...");
        socket.on("receive_password", handleReceivePassword);

        // تنظيف الحدث عند الخروج
        return () => {
            console.log("🛑 Breaker stopped listening for 'receive_password'.");
            socket.off("receive_password", handleReceivePassword);
        };
    }, [mode]); // نعتمد فقط على mode لضمان عدم إعادة التسجيل بشكل متكرر

    // 4. معالجة التخمين (Guess Logic)
    const handleGuess = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isChecking || !breakerInput.trim()) return;

        setIsChecking(true);
        
        try {
            let isCorrect = false;

            if (mode === 'multiplayer') {
                // فحص مباشر بدون داتابيز (ملتي بلاير)
                isCorrect = breakerInput.toLowerCase() === correctAnswerFromServer?.toLowerCase();
                
                // إضافة تأخير وهمي بسيط ليعطي شعور الاختراق
                await new Promise(resolve => setTimeout(resolve, 800));
                socket.emit("breaker_guess", {
                    sessionId,
                    guess: breakerInput,
                    isCorrect: isCorrect
                }); 
            } else {
                // فحص عبر الداتابيز (سنقل بلاير)
                const token = localStorage.getItem('token');
                const res = await axios.post(`${BASE_URL}/games/password/verify-breaker`, {
                    challengeId, userGuess: breakerInput, gameId, duration: 180 - timeLeft
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                isCorrect = res.data.success;
            }

            if (isCorrect) {
                playSuccessSound();
                setIsAnswered(true);
                // إطلاق الكريستال (Confetti)
                const duration = 3 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
                const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
                const interval: any = setInterval(function () {
                    const timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) return clearInterval(interval);
                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);

                // if (mode === 'multiplayer') {
                //     socket.emit('game_over', { sessionId, winner: 'breaker' });
                // }
                setTimeout(() => handleFinishGame('Win'), 1500);

            } else {
                playErrorSound();
                const newLives = lives - 1;
                setLives(newLives);
                setBreakerInput("");

                // setIsAlertActive(true);
                // setTimeout(() => setIsAlertActive(false), 500);

                if (newLives <= 0) {
                    // 🔥 نعلم السيرفر إن الميكر فاز
                    // if (mode === 'multiplayer') {
                    //     socket.emit('game_over', { sessionId, winner: 'maker' });
                    // }
                    // دالة handleFinishGame('Loss') راح تتنفذ تلقائياً عبر الـ useEffect حق التايمر اللي فوق
                    handleFinishGame('Loss');
                } else {
                    setBreakerInput("");
                    setIsAlertActive(true);
                    setTimeout(() => setIsAlertActive(false), 500);
                }

            }
        } catch (err) {
            console.error("Verification failed", err);
        } finally {
            setIsChecking(false);
        }
    };

    // 5. إنهاء اللعبة (End Game)
    const handleFinishGame = async (status: 'Win' | 'Loss') => {
        if (mode === 'multiplayer') {
            // 🌐 قسم الملتي بلاير: يرسل للسيرفر ويرجع لغرفة الانتظار بصمت
            const winnerRole = status === 'Win' ? 'breaker' : 'maker';
            socket.emit('match_concluded', { 
                sessionId, 
                winner: winnerRole,
                breakerTime: 180 - timeLeft,
                breakerMistakes: 3 - lives
            });
        } else {
            // 👤 قسم السنقل بلاير: نطلع له شاشة الفوز/الخسارة هنا لأنه ما يرجع للغرفة
            const winXP = 25 * initialLevel;
            const gameResults = {
                status,
                score: status === 'Win' ? winXP : 0,
                duration: 180 - timeLeft,
                mistakesCount: 3 - lives
            };

            // تصميم رسالة السنقل بلاير
            const title = status === 'Win' ? '[ACCESS_GRANTED]' : '[CONNECTION_LOST]';
            const color = status === 'Win' ? '#10b981' : '#ef4444';
            
            Swal.fire({
                title: `<span style="color: ${color}; font-family: monospace; font-weight: bold;">${title}</span>`,
                text: status === 'Win' ? "System Override Successful. Good job Agent." : "Strikes exhausted. Retreat immediately.",
                background: '#050810',
                confirmButtonText: status === 'Win' ? 'PROCEED' : 'REBOOT SYSTEM',
                confirmButtonColor: color,
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    onFinish(gameResults); // إرسال النتيجة للأب (PasswordMakerBreaker) عشان يحفظها ويوجهك
                }
            });
        }
    };

    
    // شاشة الانتظار للملتي بلاير
    if (isWaitingForMaker) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] w-full text-red-500 animate-pulse font-mono z-50">
                <Loader2 size={64} className="animate-spin mb-6" />
                <h2 className="text-2xl font-black tracking-widest uppercase">WAITING FOR MAKER...</h2>
                <p className="text-sm opacity-60 mt-2">Intercepting security sequence deployment</p>
            </div>
        );
    }

    if (!breakerData) return <div className="flex justify-center items-center h-[500px]"><Loader2 className="animate-spin text-red-500" size={40}/></div>;

    // تمرير البيانات للواجهة الغبية (Dumb Component)
    return (
        <BreakerLayout 
            scenario={breakerData}
            timeLeft={timeLeft}
            lives={lives}
            points_pool={initialLevel * 25}
            initialLevel={initialLevel}
            breakerInput={breakerInput}
            isAlertActive={isAlertActive}
            handleKeyPress={handleKeyPress}
            setBreakerInput={setBreakerInput}
            isChecking={isChecking}
            isAnswered={isAnswered}
            onGuess={handleGuess}
            displayedAnalysis={displayedAnalysis}
        />
    );
};

export default BreakerController;