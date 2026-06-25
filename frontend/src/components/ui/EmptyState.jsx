import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { fadeUp } from '../../theme/motion';

export default function EmptyState({ icon, title, description, action, className }) {
  const Icon = icon || Inbox;
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className || ''}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-600">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-bold text-content-primary">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-content-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
