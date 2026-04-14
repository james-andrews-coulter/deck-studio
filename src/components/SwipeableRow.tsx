import { motion, useMotionValue, animate } from 'framer-motion';
import { useState, type ReactNode, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SwipeAction = {
  label: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
  className: string;
};

type Props = {
  children: ReactNode;
  actions: SwipeAction[];
  className?: string;
};

const ACTION_BUTTON_WIDTH = 80; // px per revealed action button

export function SwipeableRow({ children, actions, className }: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const totalWidth = actions.length * ACTION_BUTTON_WIDTH;

  const snapOpen = () =>
    animate(x, -totalWidth, {
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
    <div className={cn('relative overflow-hidden rounded-md', className)}>
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick();
              snapClose();
            }}
            className={cn(
              'flex w-20 items-center justify-center gap-1 text-xs font-medium text-white',
              action.className,
            )}
          >
            <action.icon className="h-4 w-4" /> {action.label}
          </button>
        ))}
      </div>
      <motion.div
        style={{ x }}
        drag="x"
        dragElastic={0.2}
        dragConstraints={{ left: -totalWidth, right: 0 }}
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
