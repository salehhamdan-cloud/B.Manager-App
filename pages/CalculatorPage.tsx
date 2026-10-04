import React, { useState } from 'react';

const CalculatorPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'standard' | 'area'>('standard');

    // --- Standard Calculator Logic ---
    const [display, setDisplay] = useState('0');
    const [currentValue, setCurrentValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(true);
    const [memory, setMemory] = useState<number>(0);

    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
        } else if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const clearAll = () => {
        setDisplay('0');
        setCurrentValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    };

    const performCalculation = (): number => {
        if (currentValue === null || operator === null) return parseFloat(display);
        const inputValue = parseFloat(display);
        
        const calculations: { [key: string]: (a: number, b: number) => number } = {
            '/': (a, b) => b === 0 ? 0 : a / b, // Prevent division by zero
            '*': (a, b) => a * b,
            '+': (a, b) => a + b,
            '-': (a, b) => a - b,
            '=': (_a, b) => b
        };

        const result = calculations[operator](currentValue, inputValue);
        return result;
    };

    const handleOperator = (nextOperator: string) => {
        const inputValue = parseFloat(display);

        if (operator && !waitingForOperand) {
            const result = performCalculation();
            setCurrentValue(result);
            setDisplay(String(result));
        } else {
             setCurrentValue(inputValue);
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };
    
    const handleEquals = () => {
        if (operator) {
            const result = performCalculation();
            setDisplay(String(result));
            setCurrentValue(null);
            setOperator(null);
            setWaitingForOperand(true);
        }
    };
    
    // --- Unary Operations ---
    const handleUnaryOperator = (operation: (val: number) => number) => {
        const value = parseFloat(display);
        const result = operation(value);
        setDisplay(String(result));
        setWaitingForOperand(true);
    };
    
    const handleToggleSign = () => handleUnaryOperator(val => val * -1);
    const handleSquare = () => handleUnaryOperator(val => Math.pow(val, 2));
    const handleSquareRoot = () => {
        const value = parseFloat(display);
        if (value < 0) return;
        handleUnaryOperator(val => Math.sqrt(val));
    };
    const handlePercentage = () => handleUnaryOperator(val => val / 100);

    // --- Memory Functions ---
    const handleMemoryClear = () => setMemory(0);
    const handleMemoryRecall = () => {
        setDisplay(String(memory));
        setWaitingForOperand(true);
    };
    const handleMemoryAdd = () => {
        setMemory(memory + parseFloat(display));
        setWaitingForOperand(true);
    };
    const handleMemorySubtract = () => {
        setMemory(memory - parseFloat(display));
        setWaitingForOperand(true);
    };

    // --- Area Calculator Logic ---
    const [shape, setShape] = useState<'rectangle' | 'circle' | 'triangle'>('rectangle');
    const [inputs, setInputs] = useState<{[key: string]: string}>({});
    const [area, setArea] = useState<number | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputs({...inputs, [e.target.name]: e.target.value});
        setArea(null);
    };

    const calculateArea = () => {
        const values = Object.fromEntries(
            Object.entries(inputs).map(([key, value]) => [key, parseFloat(String(value))])
        );
        let result = 0;
        switch(shape) {
            case 'rectangle':
                if (values.length > 0 && values.width > 0) result = values.length * values.width;
                break;
            case 'circle':
                if (values.radius > 0) result = Math.PI * Math.pow(values.radius, 2);
                break;
            case 'triangle':
                if (values.base > 0 && values.height > 0) result = 0.5 * values.base * values.height;
                break;
        }
        setArea(result);
    };

    const renderAreaInputs = () => {
        switch(shape) {
            case 'rectangle':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">אורך (מטרים)</label>
                            <input name="length" type="number" placeholder="0.00" value={inputs.length || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono-numbers focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">רוחב (מטרים)</label>
                            <input name="width" type="number" placeholder="0.00" value={inputs.width || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono-numbers focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                        </div>
                    </>
                );
            case 'circle':
                return (
                    <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-600 mb-1">רדיוס (מטרים)</label>
                        <input name="radius" type="number" placeholder="0.00" value={inputs.radius || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono-numbers focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                    </div>
                );
            case 'triangle':
                return (
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">בסיס (מטרים)</label>
                            <input name="base" type="number" placeholder="0.00" value={inputs.base || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono-numbers focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">גובה (מטרים)</label>
                            <input name="height" type="number" placeholder="0.00" value={inputs.height || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono-numbers focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                        </div>
                    </>
                );
        }
    };

    // --- Components ---
    const Button: React.FC<{ onClick: () => void; className?: string; children: React.ReactNode; colSpan?: number }> = ({ onClick, className = '', children, colSpan = 1 }) => (
        <button
            onClick={onClick}
            className={`h-13 flex items-center justify-center text-lg sm:text-xl font-bold rounded-2xl transition-all duration-150 active:scale-95 shadow-2xs select-none ${colSpan === 4 ? 'col-span-4' : 'col-span-1'} ${className}`}
        >
            {children}
        </button>
    );

    return (
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/90 p-4 sm:p-6 space-y-5 animate-fadeIn">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl gap-1">
                <button 
                    onClick={() => setActiveTab('standard')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                        activeTab === 'standard' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    מחשבון הנדסי
                </button>
                <button 
                    onClick={() => setActiveTab('area')}
                    className={`py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 ${
                        activeTab === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    חישוב שטחים (מ״ר)
                </button>
            </div>
        
            {activeTab === 'standard' ? (
                <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl border border-slate-800">
                    <div className="bg-slate-950/80 text-white text-right rtl:text-left rounded-2xl p-4 min-h-[5.5rem] flex items-end justify-end border border-slate-800">
                        <p className="text-3xl sm:text-4xl font-mono-numbers font-bold tracking-wider truncate text-sky-400">
                            {display}
                        </p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                        <Button onClick={handleMemoryClear} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm">MC</Button>
                        <Button onClick={handleMemoryRecall} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm">MR</Button>
                        <Button onClick={handleMemorySubtract} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm">M-</Button>
                        <Button onClick={handleMemoryAdd} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs sm:text-sm">M+</Button>

                        <Button onClick={handleSquare} className="bg-slate-800 text-sky-300 hover:bg-slate-700">x²</Button>
                        <Button onClick={handleSquareRoot} className="bg-slate-800 text-sky-300 hover:bg-slate-700">√</Button>
                        <Button onClick={handlePercentage} className="bg-slate-800 text-sky-300 hover:bg-slate-700">%</Button>
                        <Button onClick={clearAll} className="bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-900/40">C</Button>

                        <Button onClick={() => inputDigit('7')} className="bg-slate-800 text-white hover:bg-slate-700">7</Button>
                        <Button onClick={() => inputDigit('8')} className="bg-slate-800 text-white hover:bg-slate-700">8</Button>
                        <Button onClick={() => inputDigit('9')} className="bg-slate-800 text-white hover:bg-slate-700">9</Button>
                        <Button onClick={() => handleOperator('/')} className="bg-sky-600 text-white hover:bg-sky-500">÷</Button>

                        <Button onClick={() => inputDigit('4')} className="bg-slate-800 text-white hover:bg-slate-700">4</Button>
                        <Button onClick={() => inputDigit('5')} className="bg-slate-800 text-white hover:bg-slate-700">5</Button>
                        <Button onClick={() => inputDigit('6')} className="bg-slate-800 text-white hover:bg-slate-700">6</Button>
                        <Button onClick={() => handleOperator('*')} className="bg-sky-600 text-white hover:bg-sky-500">×</Button>
                        
                        <Button onClick={() => inputDigit('1')} className="bg-slate-800 text-white hover:bg-slate-700">1</Button>
                        <Button onClick={() => inputDigit('2')} className="bg-slate-800 text-white hover:bg-slate-700">2</Button>
                        <Button onClick={() => inputDigit('3')} className="bg-slate-800 text-white hover:bg-slate-700">3</Button>
                        <Button onClick={() => handleOperator('-')} className="bg-sky-600 text-white hover:bg-sky-500">-</Button>

                        <Button onClick={handleToggleSign} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">+/-</Button>
                        <Button onClick={() => inputDigit('0')} className="bg-slate-800 text-white hover:bg-slate-700">0</Button>
                        <Button onClick={inputDecimal} className="bg-slate-800 text-white hover:bg-slate-700">.</Button>
                        <Button onClick={() => handleOperator('+')} className="bg-sky-600 text-white hover:bg-sky-500">+</Button>
                        
                        <Button onClick={handleEquals} colSpan={4} className="bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 text-2xl">=</Button>
                    </div>
                </div>
            ) : (
                 <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200/90 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { key: 'rectangle', label: 'מלבן' },
                            { key: 'circle', label: 'עיגול' },
                            { key: 'triangle', label: 'משולש' },
                        ].map(s => (
                            <button 
                                key={s.key}
                                onClick={() => { setShape(s.key as any); setInputs({}); setArea(null); }} 
                                className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                                    shape === s.key ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {renderAreaInputs()}
                    </div>

                    <button onClick={calculateArea} className="btn-primary w-full text-sm py-2.5 flex items-center justify-center">
                        חשב שטח (מ״ר)
                    </button>

                    {area !== null && (
                         <div className="text-center p-4 bg-white rounded-2xl border border-sky-200/80 shadow-xs">
                             <p className="text-xs text-slate-500 font-semibold">תוצאת השטח המחושב:</p>
                             <p className="text-3xl font-bold text-sky-700 font-mono-numbers mt-1">{area.toFixed(2)} מ״ר</p>
                         </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CalculatorPage;
