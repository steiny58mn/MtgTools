import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Palette } from "lucide-react";
import { apiPaths } from "../Utilities/Enums";
import { cn } from "../lib/utils";

export default function ColorDropDown(props: { updateType: number, textAreaRef: React.RefObject<HTMLTextAreaElement | null> }) {
    const [selectedColor, setColorCombination] = useState("Select a Color Combination");
    const [colors, setColors] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (color: string) => {
        setColorCombination(color);
        setIsOpen(false);
        void getBBCodeForColorCombination(color);
    }

    async function getColors() {
        try {
            const res = await fetch(apiPaths.DeckColors);
            const data = await res.json();
            setColors(data);
        } catch (err) {
            console.error("Failed to fetch colors", err);
        }
    }

    useEffect(() => {
        void getColors();
    }, []);

    async function getBBCodeForColorCombination(color: string) {
        try {
            const res = await fetch(`${apiPaths.GetBbCode}?color=${color}&bbCodeType=${props.updateType}`);
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

            if (props.textAreaRef.current) {
                props.textAreaRef.current.value = data;
                // Dispatch change event to ensure any listeners are triggered
                props.textAreaRef.current.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } catch (err) {
            console.error("Failed to fetch BBCode", err);
        }
    }

    return (
        <div className="relative inline-block w-full max-w-md">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-100 hover:bg-purple-500/20 transition-all duration-200"
            >
                <div className="flex items-center gap-2">
                    <Palette size={18} className="text-purple-400" />
                    <span className="font-medium">{selectedColor}</span>
                </div>
                <ChevronDown 
                    size={18} 
                    className={cn("text-purple-400 transition-transform duration-200", isOpen && "rotate-180")} 
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 mt-2 w-full glass rounded-xl shadow-2xl border border-purple-500/20 overflow-hidden"
                    >
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {colors.map((color, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelect(color)}
                                    className="w-full text-left px-4 py-3 text-slate-300 hover:bg-purple-500/20 hover:text-white transition-colors border-b border-purple-500/5 last:border-0"
                                >
                                    {color}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}