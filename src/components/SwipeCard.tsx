import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useState } from 'react';
import type { Card, FieldMapping } from '@/lib/types';
import { CardView } from './CardView';

type Props = {
  card: Card;
  mapping: FieldMapping;
  onCommit: (direction: 'keep' | 'discard') => void;
};

export function SwipeCard({ card, mapping, onCommit }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const keepOpacity = useTransform(x, [40, 140], [0, 1]);
  const discardOpacity = useTransform(x, [-40, -140], [0, 1]);
  const [committing, setCommitting] = useState(false);

  const commit = (dir: 'keep' | 'discard') => {
    if (committing) return;
    setCommitting(true);
    animate(x, dir === 'keep' ? 500 : -500, {
      duration: 0.3,
      onComplete: () => onCommit(dir),
    });
  };

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragElastic={0.7}
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
          commit(info.offset.x > 0 ? 'keep' : 'discard');
        } else {
          animate(x, 0, { type: 'spring', stiffness: 300 });
        }
      }}
      className="relative mx-auto aspect-[3/4] w-[min(24rem,calc(100vw-2rem))]"
      data-testid="swipe-card"
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <CardView card={card} mapping={mapping} className="w-full" />
      </div>
      <motion.div
        style={{ opacity: keepOpacity }}
        className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-emerald-500/20"
      />
      <motion.div
        style={{ opacity: discardOpacity }}
        className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-rose-500/20"
      />
    </motion.div>
  );
}
