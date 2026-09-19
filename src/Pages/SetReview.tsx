import { useRef, useState } from 'react';
import ColorDropDown from "../Components/ColorDropDown.tsx";
import { apiPaths, ToolTypeCodes } from "../Utilities/Enums";
import type { ClipboardEvent } from "react";
import { motion } from "motion/react";
import { BookOpen, AlertCircle } from "lucide-react";

function SetReview() {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    async function FormatPastedText(e: ClipboardEvent<HTMLTextAreaElement>) {
        if (textAreaRef.current) {
            e.preventDefault();
            const cursorPosition = textAreaRef.current.selectionStart || 0;
            const pastedText = await navigator.clipboard.readText();
            const existingText = textAreaRef.current.value;

            setIsProcessing(true);
            try {
                const res = await fetch(apiPaths.FormatText, {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pastedText, cursorPosition, ExistingText: existingText }),
                });
                const raw = await res.text();
                let data = raw;
                try {
                    const parsed = JSON.parse(raw);
                    if (typeof parsed === "string") {
                        data = parsed;
                    }
                } catch {
                    // Keep raw if not a JSON-encoded string
                }
                
                if (textAreaRef.current) {
                    textAreaRef.current.value = data;
                    const newPos = cursorPosition + pastedText.length + 4;
                    textAreaRef.current.setSelectionRange(newPos, newPos);
                }
            } catch (error) {
                console.error('Error formatting text:', error);
            } finally {
                setIsProcessing(false);
            }
        }
    }

    return (
        <div className="space-y-8 p-4">
            <div className="text-center space-y-4">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-purple-500/20"
                >
                    <BookOpen className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">Set Review</h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Analyze the new meta with style."
                    </p>
                </div>
            </div>

            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass rounded-[2rem] p-8 md:p-12 border border-purple-500/20 shadow-2xl space-y-10"
            >
                <div className="flex flex-col items-center gap-4">
                    <ColorDropDown updateType={ToolTypeCodes.SetReview} textAreaRef={textAreaRef}/>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Editor</label>
                        {isProcessing && (
                            <span className="text-xs font-bold text-purple-400 animate-pulse">Processing...</span>
                        )}
                    </div>
                    <textarea
                        id="SetReviewTextArea"
                        ref={textAreaRef}
                        className="w-full h-[500px] bg-slate-950/50 border border-purple-500/10 rounded-2xl p-8 text-slate-300 font-mono text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/40 outline-none transition-all resize-none shadow-inner leading-relaxed"
                        onPaste={FormatPastedText}
                        placeholder="Select color then paste card text here for auto-formatting..."
                    />
                </div>

                <div className="flex items-start gap-4 p-6 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                    <AlertCircle className="text-purple-400 shrink-0" size={20} />
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                        <strong className="text-purple-300 not-italic">How it works:</strong> Custom formatting is pulled from the MTG Tools API as you paste. It inserts card headers, color tags, and structure automatically.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default SetReview;