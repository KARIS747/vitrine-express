import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, RefreshCw, Sparkles, Upload, Zap } from 'lucide-react';
import { CompressionResult } from '../utils/imageCompression';

interface ImageUploadDropzoneProps {
  imageUrl?: string;
  isCompressing: boolean;
  compressionInfo?: CompressionResult | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  imageUrl,
  isCompressing,
  compressionInfo,
  onFileSelect,
  label = 'Photo du produit *',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const gainPercent = compressionInfo && compressionInfo.originalSizeKB > 0
    ? Math.max(0, Math.round((1 - compressionInfo.compressedSizeKB / compressionInfo.originalSizeKB) * 100))
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-ink-700 dark:text-ink-300 uppercase tracking-wider">
          {label}
        </label>
        {compressionInfo && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800"
          >
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>-{gainPercent}% de data</span>
          </motion.span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
        disabled={isCompressing}
      />

      {/* CAS 1 : EN COURS DE COMPRESSION (Animation Scanner Laser) */}
      {isCompressing && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-400 bg-emerald-950/90 flex flex-col items-center justify-center p-6 text-center text-white shadow-md">
          {/* Faisceau laser animé de haut en bas */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]"
            animate={{ top: ['5%', '92%', '5%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />

          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3 text-emerald-300 shadow-inner"
          >
            <Zap className="w-7 h-7 text-emerald-400" />
          </motion.div>

          <p className="text-sm font-bold text-emerald-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
            <span>Optimisation intelligente de la photo...</span>
          </p>
          <p className="text-xs text-emerald-300/80 mt-1 max-w-xs">
            Compression haute résolution sans perte de qualité visuelle pour économiser la data de vos clients.
          </p>

          <div className="mt-3 w-48 h-1.5 rounded-full bg-emerald-900 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-400"
              animate={{ width: ['10%', '85%', '98%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* CAS 2 : IMAGE PRÊTE AVEC APERÇU NET */}
      {!isCompressing && imageUrl && (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-ink-200 dark:border-ink-700 group bg-warm-100 dark:bg-ink-950 shadow-xs">
          <img
            src={imageUrl}
            alt="Aperçu"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />

          {/* Overlay interactif pour changer la photo */}
          <div className="absolute inset-0 bg-ink-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-ink-900 text-xs font-semibold cursor-pointer shadow-md hover:bg-warm-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Changer de photo</span>
            </button>
          </div>

          {/* Badge statistiques de compression en bas à gauche */}
          {compressionInfo && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-sm text-[11px] text-white flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {compressionInfo.originalSizeKB > 0 && `${compressionInfo.originalSizeKB} Ko ➔ `}
                <strong className="text-emerald-300">{compressionInfo.compressedSizeKB} Ko</strong>
                {gainPercent > 0 && ` (-${gainPercent}%)`}
              </span>
            </motion.div>
          )}

          {/* Bouton tactile permanent pour mobile en haut à droite */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sm:hidden absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-white backdrop-blur-sm"
            title="Changer"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CAS 3 : AUCUNE IMAGE SÉLECTIONNÉE (DROPZONE D'UPLOAD) */}
      {!isCompressing && !imageUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const dummyEvent = {
                target: { files: [file] },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onFileSelect(dummyEvent);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]'
              : 'border-ink-200 dark:border-ink-700 hover:border-brand-600 dark:hover:border-brand-500 bg-warm-50/50 dark:bg-ink-950 hover:bg-brand-50/20'
          }`}
        >
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="w-13 h-13 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 flex items-center justify-center mb-2.5 shadow-xs"
          >
            <Camera className="w-6 h-6" />
          </motion.div>

          <span className="text-xs sm:text-sm font-bold text-ink-900 dark:text-white text-center">
            Prendre une photo ou choisir dans la galerie
          </span>
          <span className="text-[11px] text-ink-500 dark:text-ink-400 mt-1 text-center max-w-xs">
            Compression automatique instantanée pour charger à la vitesse de l'éclair sur mobile.
          </span>
        </div>
      )}
    </div>
  );
};
