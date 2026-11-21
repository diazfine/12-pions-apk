import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Coins,
  Gem,
  Sparkles,
  Check,
  Gift,
  Palette,
  Shield,
  Crown,
  Lock,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { sound } from '../utils/audio';
import { persistProgressToFirestore } from '../services/firebaseProfile';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onAddCoins: (amount: number) => void;
  onShowToast: (msg: string) => void;
}

interface ShopItem {
  id: string;
  name: string;
  category: 'coins' | 'boards' | 'pawns';
  price: number;
  currency: 'coins' | 'free';
  icon: string;
  desc: string;
  popular?: boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onAddCoins,
  onShowToast,
}) => {
  const { t, formatNumber } = useTranslation();
  const [activeTab, setActiveTab] = useState<'coins' | 'boards' | 'pawns'>('coins');
  const [claimedFreePack, setClaimedFreePack] = useState<boolean>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      return localStorage.getItem('shop_daily_free_pack') === today;
    } catch {
      return false;
    }
  });

  const [equippedBoard, setEquippedBoard] = useState<string>(() => {
    return localStorage.getItem('equipped_board_theme') || 'board_emerald';
  });

  const [equippedPawns, setEquippedPawns] = useState<string>(() => {
    return localStorage.getItem('equipped_pawns_skin') || 'pawns_classic';
  });

  const [ownedItems, setOwnedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('owned_shop_items');
      return saved ? JSON.parse(saved) : ['board_emerald', 'pawns_classic'];
    } catch {
      return ['board_emerald', 'pawns_classic'];
    }
  });

  // Handle Escape key to close the shop modal cleanly
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClaimFreePack = () => {
    if (claimedFreePack) {
      onShowToast(t('alreadyReceivedToday', '✓ Déjà reçu aujourd’hui ! Revenez demain'));
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    try {
      localStorage.setItem('shop_daily_free_pack', today);
    } catch {}
    setClaimedFreePack(true);
    onAddCoins(500);
    sound.playCoins();
    onShowToast(`🎁 +500 ${t('coinPacksTab', 'Pièces d’Or')} ${t('priceFree', 'GRATUIT')} !`);
  };

  const handleBuyItem = (item: ShopItem) => {
    if (ownedItems.includes(item.id)) {
      if (item.category === 'boards') {
        setEquippedBoard(item.id);
        localStorage.setItem('equipped_board_theme', item.id);
        if (userProfile.authProvider === 'google') {
          void persistProgressToFirestore(userProfile);
        }
        sound.playSelect();
        onShowToast(`✓ ${item.name} ${t('equippedBtn', 'Équipé')} !`);
      } else if (item.category === 'pawns') {
        setEquippedPawns(item.id);
        localStorage.setItem('equipped_pawns_skin', item.id);
        if (userProfile.authProvider === 'google') {
          void persistProgressToFirestore(userProfile);
        }
        sound.playSelect();
        onShowToast(`✓ ${item.name} ${t('equippedBtn', 'Équipé')} !`);
      }
      return;
    }

    if (userProfile.coins < item.price) {
      sound.playPenalty();
      onShowToast(t('notEnoughCoins', 'Pièces insuffisantes ! Tournez la roue pour en gagner plus.'));
      return;
    }

    // Purchase item
    const newOwned = [...ownedItems, item.id];
    setOwnedItems(newOwned);
    try {
      localStorage.setItem('owned_shop_items', JSON.stringify(newOwned));
    } catch {}

    if (item.category === 'boards') {
      setEquippedBoard(item.id);
      localStorage.setItem('equipped_board_theme', item.id);
    } else if (item.category === 'pawns') {
      setEquippedPawns(item.id);
      localStorage.setItem('equipped_pawns_skin', item.id);
    }

    onAddCoins(-item.price);
    sound.playCoins();

    onShowToast(t('toastShopUnlocked', '🎉 {name} débloqué avec succès !').replace('{name}', item.name));
  };

  const coinItems: ShopItem[] = [
    {
      id: 'pack_starter',
      name: t('shopItemStarterName', 'Sac de Pièces de l’Initié'),
      category: 'coins',
      price: 0,
      currency: 'free',
      icon: '🪙',
      desc: t('shopItemStarterDesc', '+500 Pièces d’or offertes chaque jour !'),
    },
    {
      id: 'pack_warrior',
      name: t('shopItemWarriorName', 'Coffre du Guerrier'),
      category: 'coins',
      price: 0,
      currency: 'free',
      icon: '💰',
      desc: t('shopItemWarriorDesc', '+1 200 Pièces d’or dans les défis quotidiens !'),
      popular: true,
    },
    {
      id: 'pack_royal',
      name: t('shopItemRoyalName', 'Trésor Royal du Grand Maître'),
      category: 'coins',
      price: 0,
      currency: 'free',
      icon: '👑',
      desc: t('shopItemRoyalDesc', 'Jusqu’à 5 000 Pièces sur la Roue de la Fortune !'),
    },
  ];

  const boardItems: ShopItem[] = [
    {
      id: 'board_emerald',
      name: t('shopBoardEmeraldName', 'Plateau Émeraude Royal'),
      category: 'boards',
      price: 0,
      currency: 'free',
      icon: '🟩',
      desc: t('shopBoardEmeraldDesc', 'Le plateau royal officiel en velours émeraude et dorures.'),
    },
    {
      id: 'board_wood',
      name: t('shopBoardWoodName', 'Bois Précieux d’Ébène'),
      category: 'boards',
      price: 1500,
      currency: 'coins',
      icon: '🪵',
      desc: t('shopBoardWoodDesc', 'Texture bois traditionnel noble sculpté à la main.'),
    },
    {
      id: 'board_marble',
      name: t('shopBoardMarbleName', 'Marbre Impérial & Or'),
      category: 'boards',
      price: 3000,
      currency: 'coins',
      icon: '🏛️',
      desc: t('shopBoardMarbleDesc', 'Marbre blanc impérial avec incrustations dorées.'),
      popular: true,
    },
  ];

  const pawnItems: ShopItem[] = [
    {
      id: 'pawns_classic',
      name: t('shopPawnsClassicName', 'Pions Vert & Rouge Royaux'),
      category: 'pawns',
      price: 0,
      currency: 'free',
      icon: '🟢',
      desc: t('shopPawnsClassicDesc', 'Le set légendaire aux couleurs du jeu 12 PIONS.'),
    },
    {
      id: 'pawns_gold',
      name: t('shopPawnsGoldName', 'Pions Or Pur & Rubis'),
      category: 'pawns',
      price: 2000,
      currency: 'coins',
      icon: '🟡',
      desc: t('shopPawnsGoldDesc', 'Pions polis avec reflets dorés et gemmes sculptées.'),
      popular: true,
    },
    {
      id: 'pawns_crystal',
      name: t('shopPawnsCrystalName', 'Pions Cristal & Saphir'),
      category: 'pawns',
      price: 4000,
      currency: 'coins',
      icon: '💎',
      desc: t('shopPawnsCrystalDesc', 'Cristal translucide étincelant avec couronne royale.'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#0a3828] via-[#06241b] to-[#03150f] border-2 border-amber-400/70 rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(245,197,24,0.25)] flex flex-col gap-3.5 max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-300 uppercase tracking-wider">
                {t('shopTitle', 'BOUTIQUE DU ROYAUME')}
              </h2>
              <span className="text-[10px] text-amber-200/70">
                {t('shopSubtitle', 'Personnalisez votre jeu & profitez des cadeaux')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Coins Balance Pill */}
        <div className="flex items-center justify-between bg-[#041a12]/95 border border-amber-400/50 px-3.5 py-1.5 rounded-2xl shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-sm">🪙</span>
            <span className="text-xs font-black text-amber-300 font-mono">
              {formatNumber(userProfile.coins || 0)} {t('coinPacksTab', t('coinsLabel', 'Pièces d’Or'))}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('levelTag', t('levelLabel', 'Niveau'))} {formatNumber(userProfile.level)}</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-2xl border border-amber-500/20 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('coins')}
            className={`py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'coins'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md'
                : 'text-amber-200/70 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{t('coinPacksTab', 'Pièces')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('boards')}
            className={`py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'boards'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md'
                : 'text-amber-200/70 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t('boardThemesTab', 'Plateaux')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pawns')}
            className={`py-2 px-2 rounded-xl font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pawns'
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md'
                : 'text-amber-200/70 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('pawnSkinsTab', 'Pions')}</span>
          </button>
        </div>

        {/* Tab 1: COINS & FREE PACKS */}
        {activeTab === 'coins' && (
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
            {/* Free Daily Pack Spotlight */}
            <div className="bg-gradient-to-r from-amber-950/70 via-[#174836] to-amber-950/70 border-2 border-amber-400/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center text-2xl shadow">
                  🎁
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                    {t('dailyFreeGift', 'Cadeau Quotidien Gratuit')}
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </span>
                  <span className="text-[10px] text-gray-300 mt-0.5">
                    {t('dailyFreeGiftDesc', '+500 Pièces d’or à récupérer chaque jour !')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={claimedFreePack}
                onClick={handleClaimFreePack}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow transition-all cursor-pointer ${
                  claimedFreePack
                    ? 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                    : 'bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 text-slate-950 shadow-amber-500/30 animate-pulse'
                }`}
              >
                {claimedFreePack ? t('receivedBtn', '✓ Reçu') : t('receiveBtn', 'Recevoir')}
              </button>
            </div>

            {/* Other coin acquisition methods */}
            {coinItems.slice(1).map(item => (
              <div
                key={item.id}
                className="bg-[#05261b] border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#041a12] border border-amber-500/30 flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-200">{item.name}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{item.desc}</span>
                  </div>
                </div>

                <span className="text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-400/40 px-2.5 py-1 rounded-xl">
                  {t('priceFree', 'GRATUIT')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: BOARDS */}
        {activeTab === 'boards' && (
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
            {boardItems.map(item => {
              const isOwned = ownedItems.includes(item.id);
              const isEquipped = equippedBoard === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-[#05261b] border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${
                    isEquipped
                      ? 'border-emerald-400 bg-emerald-950/30 ring-1 ring-emerald-400/50'
                      : 'border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#041a12] border border-amber-500/30 flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-200 flex items-center gap-1.5">
                        {item.name}
                        {item.popular && (
                          <span className="text-[8px] font-black bg-rose-500/30 text-rose-300 border border-rose-500/40 px-1 rounded">
                            {t('popularBadge', 'POPULAIRE')}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{item.desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEquipped ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black">
                        {t('equippedBtn', '✓ Équipé')}
                      </span>
                    ) : isOwned ? (
                      <button
                        type="button"
                        onClick={() => handleBuyItem(item)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 border border-amber-400/40 text-[11px] font-bold cursor-pointer transition-all"
                      >
                        {t('equipBtn', 'Équiper')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuyItem(item)}
                        className="px-3 py-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 text-slate-950 text-[11px] font-black cursor-pointer shadow transition-all"
                      >
                        {item.price > 0 ? `${item.price.toLocaleString()} 🪙` : t('priceFree', 'GRATUIT')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: PAWNS */}
        {activeTab === 'pawns' && (
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
            {pawnItems.map(item => {
              const isOwned = ownedItems.includes(item.id);
              const isEquipped = equippedPawns === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-[#05261b] border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${
                    isEquipped
                      ? 'border-emerald-400 bg-emerald-950/30 ring-1 ring-emerald-400/50'
                      : 'border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#041a12] border border-amber-500/30 flex items-center justify-center text-xl">
                      {item.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-200 flex items-center gap-1.5">
                        {item.name}
                        {item.popular && (
                          <span className="text-[8px] font-black bg-amber-500/30 text-amber-300 border border-amber-500/40 px-1 rounded">
                            {t('royalBadge', 'ROYAL')}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{item.desc}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEquipped ? (
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black">
                        {t('equippedBtn', '✓ Équipé')}
                      </span>
                    ) : isOwned ? (
                      <button
                        type="button"
                        onClick={() => handleBuyItem(item)}
                        className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 border border-amber-400/40 text-[11px] font-bold cursor-pointer transition-all"
                      >
                        {t('equipBtn', 'Équiper')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBuyItem(item)}
                        className="px-3 py-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 text-slate-950 text-[11px] font-black cursor-pointer shadow transition-all"
                      >
                        {item.price > 0 ? `${item.price.toLocaleString()} 🪙` : t('priceFree', 'GRATUIT')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
