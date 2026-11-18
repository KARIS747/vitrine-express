import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Check, Loader2, RefreshCw, Upload } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>-{gainPercent}% data économisée</span>
          </span>
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

      {/* CAS 1 : EN COURS DE COMPRESSION */}
      {isCompressing && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-emerald-500/30 bg-ink-950 flex flex-col items-center justify-center p-6 text-center text-white">
          {/* Ligne de scan sobre */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-emerald-400/80"
            animate={{ top: ['5%', '95%', '5%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />

          <div className="w-11 h-11 rounded-xl bg-ink-900 border border-ink-800 flex items-center justify-center mb-3 text-emerald-400">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          </div>

          <p className="text-xs font-semibold text-white">
            Optimisation de la photo pour mobile 3G...
          </p>
          <p className="text-[11px] text-ink-400 mt-1 max-w-xs">
            Compression locale sans perte de netteté pour réduire la consommation de données.
          </p>

          <div className="mt-3 w-40 h-1 rounded-full bg-ink-800 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              animate={{ width: ['10%', '80%', '98%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* CAS 2 : IMAGE PRÊTE AVEC APERÇU NET */}
      {!isCompressing && imageUrl && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-ink-200 dark:border-ink-700 group bg-warm-100 dark:bg-ink-950 shadow-xs">
          <img
            src={imageUrl}
            alt="Aperçu"
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-101"
          />

          {/* Overlay interactif pour changer la photo */}
          <div className="absolute inset-0 bg-ink-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-ink-900 text-xs font-medium cursor-pointer shadow-sm hover:bg-warm-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Changer la photo</span>
            </button>
          </div>

          {/* Badge statistiques de compression en bas à gauche */}
          {compressionInfo && (
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-ink-950/80 backdrop-blur-xs text-[11px] text-white flex items-center gap-1.5 border border-white/10">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {compressionInfo.originalSizeKB > 0 && (
                  <span className="text-ink-400">{compressionInfo.originalSizeKB} Ko → </span>
                )}
                <strong className="text-emerald-300 font-semibold">{compressionInfo.compressedSizeKB} Ko</strong>
                {gainPercent > 0 && <span className="text-ink-300"> (-{gainPercent}%)</span>}
              </span>
            </div>
          )}

          {/* Bouton tactile permanent pour mobile en haut à droite */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="sm:hidden absolute top-2 right-2 p-1.5 rounded-lg bg-ink-950/70 text-white border border-white/10"
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
