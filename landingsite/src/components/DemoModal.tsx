import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { CloseIcon, PlayIcon } from './Icons';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl?: string;
}

export default function DemoModal({ open, onClose, videoUrl }: DemoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Product demo"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e16] shadow-2xl"
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 8, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={onClose}
              aria-label="Close demo"
              className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/40 p-2 text-white/70 backdrop-blur transition-colors hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>

            <div className="aspect-video w-full bg-black">
              {videoUrl ? (
                isEmbeddable(videoUrl) ? (
                  <iframe
                    src={videoUrl}
                    title="Clariti demo"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={videoUrl} className="h-full w-full" controls autoPlay />
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#14141e] to-[#0a0a0f] text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/15 ring-1 ring-violet-400/30">
                    <PlayIcon className="h-6 w-6 translate-x-0.5 text-violet-300" />
                  </div>
                  <p className="max-w-sm px-6 text-sm text-white/50">
                    Demo video coming soon. Set{' '}
                    <span className="font-mono text-white/70">PUBLIC_DEMO_VIDEO_URL</span> to
                    embed it here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isEmbeddable(url: string) {
  return /youtube|youtu\.be|vimeo|loom|player\./i.test(url);
}
