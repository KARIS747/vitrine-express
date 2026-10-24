import React, { useState } from 'react';
import { Store } from '../types';
import { dbService } from '../services/db';
import { formatDate, getDaysRemaining, formatFCFA } from '../utils/formatters';
import { 
  KeyRound, 
  Plus, 
  Store as StoreIcon, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  RefreshCw, 
  ShieldCheck, 
  Coins,
  Search,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface LicenseManagerViewProps {
  stores: Store[];
  onRefresh: () => void;
  onSelectStore: (store: Store) => void;
}

export const LicenseManagerView: React.FC<LicenseManagerViewProps> = ({
  stores,
  onRefresh,
  onSelectStore
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('karis_admin_auth') === 'true';
  });
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreCity, setNewStoreCity] = useState('Douala');
  const [newStoreQuarter, setNewStoreQuarter] = useState('');
  const [newStorePin, setNewStorePin] = useState('1234');
  const [maxProducts, setMaxProducts] = useState(20);
  const [durationMonths, setDurationMonths] = useState(12);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === 'karis2026' || adminPinInput.trim() === 'admin') {
      sessionStorage.setItem('karis_admin_auth', 'true');
      setIsAuthenticated(true);
      toast.success("Accès Administrateur Karis déverrouillé !");
    } else {
      toast.error("Code secret administrateur incorrect");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-ink-100 shadow-elevated text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="font-display font-bold text-xl text-ink-950">
            Espace Réservé Karis
          </h2>
          <p className="text-xs text-ink-500 mt-1 mb-5">
            Saisissez votre code administrateur pour gérer les licences et les boutiques clientes.
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-3">
            <input
              type="password"
              placeholder="Code administrateur (ex: karis2026)"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none text-center font-mono tracking-widest focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Déverrouiller l'accès
            </button>
            <p className="text-[11px] text-ink-400 pt-1">
              Code par défaut : <code className="bg-warm-100 px-1 py-0.5 rounded font-mono">karis2026</code>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Financial calculations for Karis
  const activeStoresCount = stores.filter(s => Boolean(s.is_active)).length;
  const estimatedRevenue = stores.length * 5000; // 5000 FCFA per store

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      toast.error("Veuillez saisir le nom de la boutique");
      return;
    }
    if (!newStoreWhatsapp.trim()) {
      toast.error("Veuillez saisir le numéro WhatsApp");
      return;
    }

    const created = await dbService.createStoreByAdmin({
      name: newStoreName,
      whatsappNumber: newStoreWhatsapp,
      city: newStoreCity,
      quarter: newStoreQuarter,
      pinCode: newStorePin,
      maxProducts,
      durationMonths
    });

    toast.success(`Boutique ${created.name} créée avec succès !`);
    setIsCreateModalOpen(false);
    onRefresh();

    // Reset fields
    setNewStoreName('');
    setNewStoreWhatsapp('');
    setNewStoreQuarter('');
  };

  const handleToggleStatus = async (store: Store) => {
    await dbService.toggleStoreStatus(store.id);
    toast.success(`Statut de ${store.name} mis à jour`);
    onRefresh();
  };

  const handleRenewOneYear = async (store: Store) => {
    if (window.confirm(`Confirmer le renouvellement d'un an pour ${store.name} (Paiement 5 000 FCFA reçu) ?`)) {
      await dbService.renewStoreLicense(store.id, 12);
      toast.success(`Licence de ${store.name} prolongée de 1 an !`);
      onRefresh();
    }
  };

  const handleCopyOnboardingMessage = (store: Store) => {
    const storeUrl = `${window.location.origin}?store=${store.slug}`;
    const message = [
      `Félicitations pour l'ouverture de votre vitrine *${store.name}* !`,
      ``,
      `Voici vos accès officiels :`,
      `🌐 *Votre Vitrine Client :* ${storeUrl}`,
      `🔑 *Votre Clé Licence :* ${store.license_key}`,
      `🔒 *Votre Code PIN Gérant :* ${store.pin_code || '1234'}`,
      `📦 *Limite autorisée :* ${store.max_products} produits`,
      ``,
      `Vous pouvez dès maintenant ajouter vos photos et partager le lien ou votre QR code avec vos clients !`
    ].join('\n');

    navigator.clipboard.writeText(message);
    toast.success("Message d'accueil copié ! Vous pouvez l'envoyer au client sur WhatsApp.");
  };

  return (
    <div className="min-h-screen bg-warm-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Karis SuperAdmin Banner */}
        <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-ink-950 text-white rounded-3xl p-6 sm:p-8 shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6 border border-ink-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Karis • Licence Manager (L3 Informatique)</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
              Gestionnaire des Licences Boutiques
            </h1>
            <p className="text-xs sm:text-sm text-ink-400 mt-1 max-w-xl leading-relaxed">
              Créez les boutiques, délivrez les licences annuelles (5 000 FCFA) et contrôlez le quota de 20 produits par commerçant.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-bold text-sm transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une nouvelle boutique</span>
          </button>
        </div>

        {/* Business Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <StoreIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                Boutiques Créées
              </span>
              <span className="font-display font-bold text-2xl text-ink-950">
                {stores.length}
              </span>
              <span className="text-[11px] text-emerald-700 block mt-0.5">
                {activeStoresCount} actives actuellement
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                Revenus Encaissés
              </span>
              <span className="font-display font-bold text-2xl text-emerald-800">
                {formatFCFA(estimatedRevenue)}
              </span>
              <span className="text-[11px] text-ink-500 block mt-0.5">
                Sur la base de 5 000 FCFA / an
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-ink-100 shadow-subtle flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block">
                Modèle Économique
              </span>
              <span className="font-display font-bold text-lg text-ink-950">
                20 Produits / An
              </span>
              <span className="text-[11px] text-brand-700 block mt-0.5">
                Stockage Cloudflare 100% gratuit
              </span>
            </div>
          </div>
        </div>

        {/* Stores Table */}
        <div className="bg-white rounded-3xl border border-ink-100 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-ink-100 bg-warm-50/50 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-ink-950">
              Liste des Boutiques Souscrites
            </h2>
            <span className="text-xs text-ink-500">
              Total : {stores.length} licences
            </span>
          </div>

          <div className="divide-y divide-ink-100/80">
            {stores.map((store) => {
              const daysLeft = getDaysRemaining(store.expires_at);
              const isActive = Boolean(store.is_active);

              return (
                <div key={store.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-warm-50/40 transition-colors">
                  {/* Store details */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-warm-100 border border-ink-100 shrink-0 overflow-hidden">
                      <img
                        src={store.logo_url || 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80'}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold text-sm sm:text-base text-ink-950">
                          {store.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {isActive ? 'Active' : 'Suspendue'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-ink-500">
                        <span>WhatsApp : <strong>+{store.whatsapp_number}</strong></span>
                        <span>•</span>
                        <span>Ville : {store.city}</span>
                        <span>•</span>
                        <span>Articles : <strong>{store.current_products_count || 0} / {store.max_products}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-ink-400">
                        <span className="font-mono bg-warm-100 px-1.5 py-0.5 rounded">Clé : {store.license_key}</span>
                        <span className="font-mono bg-warm-100 px-1.5 py-0.5 rounded">PIN : {store.pin_code || '1234'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expiration & Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
                    <div className="text-right mr-2 hidden sm:block">
                      <span className="text-[11px] text-ink-400 block">Échéance</span>
                      <span className={`text-xs font-semibold ${
                        daysLeft < 30 ? 'text-amber-700' : 'text-ink-700'
                      }`}>
                        {formatDate(store.expires_at)} ({daysLeft}j)
                      </span>
                    </div>

                    {/* Copy WhatsApp Onboarding Welcome Message */}
                    <button
                      onClick={() => handleCopyOnboardingMessage(store)}
                      className="p-2 rounded-xl border border-ink-200 hover:bg-warm-100 text-ink-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      title="Copier le message d'embarquement pour le commerçant"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Message WhatsApp</span>
                    </button>

                    {/* Renew +1 Year (5 000 FCFA) */}
                    <button
                      onClick={() => handleRenewOneYear(store)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Prolonger de 12 mois suite au paiement"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>+1 An (5k)</span>
                    </button>

                    {/* Suspend / Reactivate button */}
                    <button
                      onClick={() => handleToggleStatus(store)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                        isActive
                          ? 'border-red-200 text-red-700 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {isActive ? 'Suspendre' : 'Réactiver'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Créer Boutique */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-ink-100 shadow-elevated">
            <h3 className="font-display font-bold text-xl text-ink-950">
              Créer une Boutique Client
            </h3>
            <p className="text-xs text-ink-500 mt-1">
              Génère la vitrine et la licence annuelle à 5 000 FCFA (20 articles max).
            </p>

            <form onSubmit={handleCreateStore} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Nom de la boutique *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Kamer Kicks Akwa"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                  Numéro WhatsApp Commerçant *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 237699000000"
                  value={newStoreWhatsapp}
                  onChange={(e) => setNewStoreWhatsapp(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Ville
                  </label>
                  <select
                    value={newStoreCity}
                    onChange={(e) => setNewStoreCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink-200 text-sm outline-none bg-white"
                  >
                    <option value="Douala">Douala</option>
                    <option value="Yaoundé">Yaoundé</option>
                    <option value="Bafoussam">Bafoussam</option>
                    <option value="Garoua">Garoua</option>
                    <option value="Kribi">Kribi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Quartier
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Akwa, Mokolo"
                    value={newStoreQuarter}
                    onChange={(e) => setNewStoreQuarter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink-200 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Code PIN Gérant
                  </label>
                  <input
                    type="text"
                    value={newStorePin}
                    onChange={(e) => setNewStorePin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ink-200 text-sm outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1">
                    Quota Produits
                  </label>
                  <input
                    type="number"
                    value={maxProducts}
                    onChange={(e) => setMaxProducts(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-ink-200 text-sm outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-warm-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Créer la boutique
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
