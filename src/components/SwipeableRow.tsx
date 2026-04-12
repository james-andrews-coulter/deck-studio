import { motion, useMotionValue, animate } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { EyeOff, FolderInput } from 'lucide-react';

type Props = {
  children: ReactNode;
  onHide: () => void;
  onRequestMove: () => void;
};

const ACTION_WIDTH = 160; // px, total width of the revealed actions

export function SwipeableRow({ children, onHide, onRequestMove }: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);

  const snapOpen = () =>
    animate(x, -ACTION_WIDTH, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      onComplete: () => setOpen(true),
    });
  const snapClose = () =>
    animate(x, 0, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      onComplete: () => setOpen(false),
    });

  return (
    <div className="relative overflow-hidden rounded-md">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        <button
          type="button"
          onClick={() => {
            onHide();
            snapClose();
          }}
          className="flex w-20 items-center justify-center gap-1 bg-amber-500 text-xs font-medium text-white"
        >
          <EyeOff className="h-4 w-4" /> Hide
        </button>
        <button
          type="button"
          onClick={() => {
            onRequestMove();
            snapClose();
          }}
          className="flex w-20 items-center justify-center gap-1 bg-sky-600 text-xs font-medium text-white"
        >
          <FolderInput className="h-4 w-4" /> Move
        </button>
      </div>
      <motion.div
        style={{ x }}
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: -ACTION_WIDTH, right: 0 }}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -40 || info.velocity.x < -200;
          if (shouldOpen) snapOpen();
          else snapClose();
        }}
        onClick={() => {
          if (open) snapClose();
        }}
        className="relative bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}
