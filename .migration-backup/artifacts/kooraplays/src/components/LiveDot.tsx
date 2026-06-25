import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LiveDot({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-3 w-3", className)}>
      <motion.span
        animate={{ scale: [1, 2], opacity: [0.7, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        className="absolute inline-flex h-full w-full rounded-full bg-destructive"
      />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
    </div>
  );
}
