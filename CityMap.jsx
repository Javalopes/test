import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { MapPin, Users, Loader2, Move, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/components/supabaseClient';
import VisitWarehouseModal from './VisitWarehouseModal';
import WeatherOverlay from './WeatherOverlay';
import CityObjects from './CityObjects';
import useClima from './useClima';
import MinerSprite from './MinerSprite';



const WORLD_W = 4000;
const WORLD_H = 4000;
const MIN_WORLD_W = 2000;
const MIN_WORLD_H = 2000;

// ─── Partículas de poeira néon ───────────────────────────────────────────────
const NEON_COLORS = ['#06b6d4', '#a78bfa', '#34d399', '#f0abfc'];
function NeonDustParticle({ x, y, onDone }) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 18 + Math.random() * 28;
  const tx = Math.cos(angle) * speed;
  const ty = Math.sin(angle) * speed + 8; // ligeiro drift para baixo
  const size = 2 + Math.random() * 3;
  const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  return (
    <motion.div
      initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
      animate={{ opacity: 0, x: tx, y: ty, scale: 0 }}
      transition={{ duration: 0.45 + Math.random() * 0.3, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px 2px ${color}`,
        pointerEvents: 'none',
        zIndex: 55,
      }}
    />
  );
}

// ─── Meu Avatar ─────────────────────────────────────────────────────────────
function MyAvatar({ mvX, mvY, isMoving, interrupted, username, profileData, targetPosRef }) {
  const [particles, setParticles] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [directionY, setDirectionY] = useState(0); // -1 = cima, 0 = horizontal, 1 = baixo
  const prevXRef = useRef(0);

  // Dispara partículas quando interrupted muda para true
  const prevInterrupted = useRef(false);
  //aki
   useEffect(() => {
    if (!isMoving) return;

    const updateDirection = () => {
      const curX = mvX.get();
      const curY = mvY.get();
      const tarX = targetPosRef.current.x;
      const tarY = targetPosRef.current.y;

      // Flip horizontal baseado no DESTINO
      setIsFlipped(tarX < curX);

      // Direção Vertical (Para o MinerSprite mostrar a mochila ou a cara)
      if (tarY < curY - 15) setDirectionY(-1);      // Cima (Costas)
      else if (tarY > curY + 15) setDirectionY(1);  // Baixo (Frente)
      else setDirectionY(0);                        // Lado (Perfil)
    };

    updateDirection(); // Executa logo no clique
    const unsubX = mvX.on('change', updateDirection);
    return () => unsubX();
  }, [isMoving, mvX, mvY, targetPosRef]);
//ate aki
  const removeParticle = useCallback((id) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <>
      {/* Partículas renderizadas fora do avatar para ficarem em coords mundo */}
      {particles.map(p => (
        <NeonDustParticle
          key={p.id}
          x={p.x}
          y={p.y}
          onDone={() => removeParticle(p.id)}
        />
      ))}
      <motion.div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          x: mvX,
          y: mvY,
          translateX: '-50%',
          translateY: '-100%',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <motion.div
          animate={isMoving ? { y: [0, -6, 0], rotate: [-10, 10, -10] } : { y: 0, rotate: 0 }}
          transition={{ repeat: isMoving ? Infinity : 0, duration: 0.18, ease: 'linear' }}
          className="flex flex-col items-center"
        >
          <div
            className="bg-slate-900/90 border border-cyan-400/70 rounded-full px-2 py-0.5 whitespace-nowrap"
            style={{ boxShadow: '0 0 8px rgba(6,182,212,0.5)', position: 'relative', top: '-30px' }}
          >
            <span className="text-[10px] text-cyan-300 font-bold">Eu</span>
          </div>
          <div style={{ width: 35, height: 55, position: 'relative' }}>
            <MinerSprite isMoving={isMoving} isFlipped={isFlipped} directionY={directionY} />
            {/* Sombra nos pés */}
            <div style={{
              position: 'absolute',
              bottom: -3,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 20,
              height: 6,
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '100%',
            }} />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─── Avatar Remoto ───────────────────────────────────────────────────────────
function RemoteAvatar({ player, onClick }) {
  const displayName = player.nome_utilizador || (player.id || '').slice(0, 6);
  const remMoving = player.em_movimento === true;
  const px = player.pos_x;
  const py = player.pos_y;
  const prevXRef = useRef(px);
  const prevYRef = useRef(py);
  const [isFlipped, setIsFlipped] = useState(false);
  const [directionY, setDirectionY] = useState(0);

  // Detecta direção do movimento para flip e direção Y
  useEffect(() => {
    if (px < prevXRef.current) {
      setIsFlipped(true);
    } else if (px > prevXRef.current) {
      setIsFlipped(false);
    }
    prevXRef.current = px;

    // Calcula direção Y
    if (py < prevYRef.current - 10) {
      setDirectionY(-1); // Cima
    } else if (py > prevYRef.current + 10) {
      setDirectionY(1); // Baixo
    } else {
      setDirectionY(0); // Horizontal
    }
    prevYRef.current = py;
  }, [px, py]);

  return (
    <motion.div
      style={{ position: 'absolute', left: 0, top: 0, translateX: '-50%', translateY: '-100%', zIndex: 30, cursor: 'pointer' }}
      animate={{ x: px, y: py }}
      transition={{ type: 'tween', duration: 0.2 }}
      onClick={onClick}
    >
      <motion.div
        animate={remMoving ? { y: [0, -6, 0], rotate: [-10, 10, -10] } : { y: 0, rotate: 0 }}
        transition={{ repeat: remMoving ? Infinity : 0, duration: 0.18, ease: 'linear' }}
        className="flex flex-col items-center"
      >
        <div className="bg-slate-900/90 border border-purple-400/50 rounded-full px-2 py-0.5 whitespace-nowrap"
          style={{ boxShadow: '0 0 6px rgba(139,92,246,0.3)', position: 'relative', top: '-30px' }}>
          <span className="text-[10px] text-purple-200 font-medium">{displayName}</span>
        </div>
        <div style={{ width: 35, height: 55, position: 'relative' }}>
          <MinerSprite isMoving={remMoving} isFlipped={isFlipped} directionY={directionY} />
          {/* Sombra nos pés */}
          <div style={{
            position: 'absolute',
            bottom: -3,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 20,
            height: 6,
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '100%',
          }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Edifício ────────────────────────────────────────────────────────────────
function PlayerBuilding({ player, isOwn, onClick, clima }) {
  const [isHovered, setIsHovered] = useState(false);
  const displayName = player?.nome_utilizador ||
    (player?.dono_id ? `${player.dono_id.slice(0, 4)}...${player.dono_id.slice(-4)}` : 'Anónimo');

  // Suporta tanto casa_pos_x/y como x/y diretos
  const px = player.casa_pos_x ?? player.x ?? 200;
  const py = player.casa_pos_y ?? player.y ?? 200;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: px,
        top: py,
        translateX: '-50%',
        translateY: '-100%',
        zIndex: isHovered ? 20 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.1 } : {}}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Sombra de oclusão no chão */}
      <div style={{
        position: 'absolute', bottom: -8, left: '50%',
        transform: 'translateX(-50%)',
        width: 48, height: 10, borderRadius: '50%',
        background: 'rgba(0,0,0,0.55)',
        filter: clima === 'ENSOLARADO' ? 'blur(3px)' : 'blur(6px)',
        zIndex: 0,
      }} />

      <div className={cn('relative', isOwn && 'drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]')}
        style={clima === 'ENSOLARADO' ? { filter: 'drop-shadow(4px 6px 0px rgba(0,0,0,0.6))' } : {}}
      >
        <div className="relative w-12 h-16">
          <div className={cn(
            'absolute bottom-0 w-full h-10 rounded-t-sm',
            isOwn ? 'bg-gradient-to-t from-cyan-700 to-cyan-500'
              : player?.is_online ? 'bg-gradient-to-t from-emerald-700 to-emerald-500'
                : 'bg-gradient-to-t from-slate-700 to-slate-500',
          )}>
            <div className="grid grid-cols-2 gap-1 p-1 pt-2">
              {[...Array(4)].map((_, i) => (
                <motion.div key={i}
                  className={cn('h-1.5 rounded-sm', player?.is_online ? 'bg-amber-300' : 'bg-slate-600')}
                  animate={player?.is_online ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
          <div className={cn(
            'absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0',
            'border-l-[24px] border-r-[24px] border-b-[16px] border-l-transparent border-r-transparent',
            isOwn ? 'border-b-cyan-800' : player?.is_online ? 'border-b-emerald-800' : 'border-b-slate-800',
          )} />
          {(player?.hashrate_total || 0) > 0 && (
            <motion.div className="absolute -top-1 left-1/2 -translate-x-1/2"
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
              <div className="w-0.5 h-3 bg-red-500" />
              <div className="w-1 h-1 bg-red-500 rounded-full absolute -top-0.5 left-1/2 -translate-x-1/2" />
            </motion.div>
          )}
        </div>
        {player?.is_online && (
          <motion.div className="absolute -top-2 -right-2 w-3 h-3 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        )}
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            style={{ position: 'absolute', bottom: '100%', left: '50%', translateX: '-50%', marginBottom: 8, zIndex: 100, pointerEvents: 'none' }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          >
            <div className="rounded-xl p-3 whitespace-nowrap"
              style={{ background: 'rgba(6,10,22,0.97)', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 20px rgba(139,92,246,0.2)', backdropFilter: 'blur(12px)' }}>
              <p className="text-white font-bold text-sm">{displayName}</p>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-cyan-400 font-mono">{player?.hashrate_total || 0} H/s</span>
                <span className={cn('font-medium', player?.is_online ? 'text-emerald-400' : 'text-slate-500')}>
                  {player?.is_online ? '● Online' : '○ Offline'}
                </span>
              </div>
              {!isOwn && <p className="text-[10px] text-purple-400 mt-1.5">Clica para visitar →</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Texto flutuante de recompensa (dinâmico por tipo) ──────────────────────
function FloatingReward({ x, y, text, type = 'tokens', onDone }) {
  // Cores e estilos por tipo
  const stylesByType = {
    TOKENS: {
      color: '#34d399',
      glow: 'rgba(52,211,153,0.9)',
      shadow: '0 0 12px rgba(52,211,153,0.9), 0 0 24px rgba(52,211,153,0.5)',
    },
    CHIPS: {
      color: '#38bdf8',
      glow: 'rgba(56,189,248,0.9)',
      shadow: '0 0 12px rgba(56,189,248,0.9), 0 0 24px rgba(56,189,248,0.5)',
    },
    STAMINA: {
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.9)',
      shadow: '0 0 12px rgba(251,191,36,0.9), 0 0 24px rgba(251,191,36,0.5)',
    },
  };
  
  const style = stylesByType[type] || stylesByType.TOKENS;

  // Som de recompensa (tiny beep sound)
  const playSound = (freq = 800, dur = 100) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur / 1000);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + dur / 1000);
    } catch (e) {
      // Audio context não disponível
    }
  };

  // Toca som apropriado ao tipo
  React.useEffect(() => {
    if (type === 'TOKENS') playSound(600, 80);
    else if (type === 'CHIPS') playSound(900, 100);
    else if (type === 'STAMINA') playSound(500, 120);
  }, [type]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -50, scale: 1.1 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        translateX: '-50%',
        zIndex: 90,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        fontWeight: 900,
        fontSize: 14,
        color: style.color,
        textShadow: style.shadow,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
      }}
    >
      {text}
    </motion.div>
  );
}

// ─── Mapa Principal ──────────────────────────────────────────────────────────
export default function CityMap({ currentPlayer, walletAddress, className, onLootCollected, onSyncComplete }) {
  const [houses, setHouses] = useState([]);
  const [remotePlayers, setRemotePlayers] = useState({});
  const [loading, setLoading] = useState(true);

  // MotionValues para posição contínua e interrompível do avatar
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Inicializa com localStorage ou padrão — será atualizado com dados reais da DB
  const savedPos = localStorage.getItem('last_pos') ? JSON.parse(localStorage.getItem('last_pos')) : { x: 200, y: 200 };
  const mvX = useMotionValue(savedPos.x);
  const mvY = useMotionValue(savedPos.y);
  const [isMoving, setIsMoving] = useState(false);
  const [interrupted, setInterrupted] = useState(false);

  // Loot no mapa (loot_mapa)
  const [lootItems, setLootItems] = useState([]);
  const lootItemsRef = useRef([]);
  const collectedRef = useRef(new Set()); // evita double-collect
  const [maxLoot, setMaxLoot] = useState(1000); // para cálculo de raridade

  // Textos flutuantes de recompensa
  const [floatingRewards, setFloatingRewards] = useState([]);

  // Modal — só abre quando visitTarget não é null E visitModalOpen é true
  const [visitTarget, setVisitTarget] = useState(null);
  const [visitModalOpen, setVisitModalOpen] = useState(false);

  // Ping visual no local do clique
  const [clickPing, setClickPing] = useState(null);

  // Refs para evitar stale closures
  const pendingVisitRef = useRef(null);
  const activeAnimRef = useRef(null);
  const targetPosRef = useRef({ x: 200, y: 200 });
  const lastSyncTimeRef = useRef(0);
  const lastSavedPosRef = useRef({ x: 200, y: 200 }); // Última posição gravada na DB

  // ── Drag / Pan ──────────────────────────────────────────────────────────
  const viewportRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);
  const isDragging = useRef(false);

  const onMouseDown = useCallback((e) => {
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y };
    isDragging.current = false;
  }, [pan]);

  const onMouseMove = useCallback((e) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mouseX;
    const dy = e.clientY - dragStart.current.mouseY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
    if (isDragging.current) {
      const vw = viewportRef.current?.clientWidth || 800;
      const vh = viewportRef.current?.clientHeight || 500;
      const newX = Math.min(0, Math.max(-(WORLD_W - vw), dragStart.current.panX + dx));
      const newY = Math.min(0, Math.max(-(WORLD_H - vh), dragStart.current.panY + dy));
      setPan({ x: newX, y: newY });
    }
  }, []);

  const onMouseUp = useCallback(() => { dragStart.current = null; }, []);

  const touchStart = useRef(null);
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchStart.current = { mouseX: t.clientX, mouseY: t.clientY, panX: pan.x, panY: pan.y };
    isDragging.current = false;
  }, [pan]);

  const onTouchMove = useCallback((e) => {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.mouseX;
    const dy = t.clientY - touchStart.current.mouseY;
    isDragging.current = true;
    const vw = viewportRef.current?.clientWidth || 800;
    const vh = viewportRef.current?.clientHeight || 500;
    const newX = Math.min(0, Math.max(-(WORLD_W - vw), touchStart.current.panX + dx));
    const newY = Math.min(0, Math.max(-(WORLD_H - vh), touchStart.current.panY + dy));
    setPan({ x: newX, y: newY });
    e.preventDefault();
  }, []);

  const onTouchEnd = useCallback(() => { touchStart.current = null; }, []);

  const clima = useClima();

  // ── Carregar casas da view v_mapa_cidade ──────────────────────────────
  useEffect(() => {
    setLoading(true);
    supabase
      .from('v_mapa_cidade')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          // erro crítico
        }
        setHouses(data || []);
        setLoading(false);
      });
  }, []);

  // ── Refetch OBRIGATÓRIO da posição real do jogador na DB ──────────────
  useEffect(() => {
    if (!walletAddress) return;

    setProfileLoading(true);
    //aki
     supabase
      .from('perfil_mineiro')
      .select('pos_x, pos_y')
      .eq('id', walletAddress)
      .single()
      .then(({ data, error }) => {
        if (error) {
          const def = { pos_x: 500, pos_y: 500 };
          mvX.set(def.pos_x); mvY.set(def.pos_y);
          setProfileData(def);
        } else if (data) {
          const startX = data.pos_x ?? 500;
          const startY = data.pos_y ?? 500;
          // Injeta os valores na DB diretamente nos MotionValues
          mvX.set(startX);
          mvY.set(startY);
          targetPosRef.current = { x: startX, y: startY };
          lastSavedPosRef.current = { x: startX, y: startY };
          setProfileData(data);
        }
        setProfileLoading(false);
      });
      //ate aki
  }, [walletAddress, mvX, mvY]);

  // ── Centrar câmara quando avatar está pronto ────────────────────────────
  useEffect(() => {
    if (!profileData || profileLoading) return;

    const sx = profileData.pos_x ?? 200;
    const sy = profileData.pos_y ?? 200;

    // Centrar câmara na posição do avatar
    const vw = viewportRef.current?.clientWidth || 800;
    const vh = viewportRef.current?.clientHeight || 500;
    const cx = Math.min(0, Math.max(-(WORLD_W - vw), -(sx - vw / 2)));
    const cy = Math.min(0, Math.max(-(WORLD_H - vh), -(sy - vh / 2)));
    setPan({ x: cx, y: cy });
  }, [profileData, profileLoading]);

  // ── Realtime outros jogadores — Broadcast Channel ─────────────────────────
  useEffect(() => {
    const channel = supabase.channel('cidade');

    // Escuta broadcast de movimento
    channel.on('broadcast', { event: 'moverse' }, (payload) => {
      const { id, x, y, movendo } = payload.payload;
      if (!id || id === walletAddress) return;

      setRemotePlayers(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          id,
          pos_x: x,
          pos_y: y,
          em_movimento: movendo,
        }
      }));
    }).subscribe();

    supabase.from('perfil_mineiro')
      .select('id, nome_utilizador, pos_x, pos_y, em_movimento, is_online')
      .neq('id', walletAddress || '')
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(p => { map[p.id] = p; });
          setRemotePlayers(map);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [walletAddress]);

  // ── Carregar loot_mapa + realtime ────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;

    // Carregar maxLoot da config
    supabase
      .from('configuracoes_globais')
      .select('valor')
      .eq('chave', 'loot_max_tokens')
      .single()
      .then(({ data }) => {
        if (data) setMaxLoot(data.valor);
      });

    supabase.from('loot_mapa').select('*').eq('recolhido', false).then(({ data, error }) => {
      const items = data || [];
      setLootItems(items);
      lootItemsRef.current = items;
    });

    const ch = supabase
      .channel('loot-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loot_mapa' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setLootItems(prev => {
            const next = prev.filter(l => l.id !== payload.old.id);
            lootItemsRef.current = next;
            return next;
          });
        } else if (payload.eventType === 'INSERT') {
          if (!payload.new.recolhido) {
            setLootItems(prev => {
              const next = [...prev, payload.new];
              lootItemsRef.current = next;
              return next;
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          // Se foi marcado como recolhido, remove; caso contrário atualiza
          if (payload.new.recolhido) {
            setLootItems(prev => {
              const next = prev.filter(l => l.id !== payload.new.id);
              lootItemsRef.current = next;
              return next;
            });
          } else {
            setLootItems(prev => {
              const next = prev.map(l => l.id === payload.new.id ? payload.new : l);
              lootItemsRef.current = next;
              return next;
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [walletAddress]);

  // ── Cleanup: Gravação final ao desmontar (sair da aba Cidade) ─────────────────
  useEffect(() => {
    return () => {
      if (!walletAddress) return;

      const finalX = mvX.get();
      const finalY = mvY.get();
      const deltaX = Math.abs(finalX - lastSavedPosRef.current.x);
      const deltaY = Math.abs(finalY - lastSavedPosRef.current.y);

      // Só grava se mudou significativamente da última gravação
      if (deltaX > 5 || deltaY > 5) {
        lastSavedPosRef.current = { x: finalX, y: finalY };
        (async () => {
          try {
            await supabase.rpc('rpc_sincronizar_movimento', {
              p_movendo: false,
              p_user_id: walletAddress,
              p_x: finalX,
              p_y: finalY,
              p_direcao_y: 0
            });
          } catch (err) {
            localStorage.setItem('last_pos', JSON.stringify({ x: finalX, y: finalY, timestamp: Date.now() }));
          }
        })();
      }
    };
  }, [walletAddress, mvX, mvY]);

  // ── Câmara dinâmica — segue o avatar em tempo real ───────────────────
  useEffect(() => {
    if (!isMoving) return;
    const unsub = mvX.on('change', () => {
      const ax = mvX.get();
      const ay = mvY.get();
      const vw = viewportRef.current?.clientWidth || 800;
      const vh = viewportRef.current?.clientHeight || 500;
      const newPanX = Math.min(0, Math.max(-(WORLD_W - vw), -(ax - vw / 2)));
      const newPanY = Math.min(0, Math.max(-(WORLD_H - vh), -(ay - vh / 2)));
      setPan({ x: newPanX, y: newPanY });
    });
    return unsub;
  }, [isMoving, mvX, mvY]);

  // ── Colisão realtime — loop a ~10fps durante movimento (async puro, sem bloquear) ───────────────
  useEffect(() => {
    if (!isMoving || !walletAddress) return;

    const RADIUS = 30;
    const interval = setInterval(() => {
      const ax = mvX.get();
      const ay = mvY.get();
      const items = lootItemsRef.current;

      for (let i = 0; i < items.length; i++) {
        const loot = items[i];
        if (collectedRef.current.has(loot.id)) continue;
        const lx = loot.pos_x ?? loot.x ?? 0;
        const ly = loot.pos_y ?? loot.y ?? 0;
        if (Math.abs(ax - lx) > RADIUS || Math.abs(ay - ly) > RADIUS) continue;
        const dist = Math.sqrt((ax - lx) ** 2 + (ay - ly) ** 2);
        if (dist >= RADIUS) continue;

        collectedRef.current.add(loot.id);

        // Remove imediatamente do mapa local (UI fluida)
        setLootItems(prev => {
          const next = prev.filter(l => l.id !== loot.id);
          lootItemsRef.current = next;
          return next;
        });

        // RPC async (sem await, sem bloquear loop)
        (async () => {
          try {
            const { data, error } = await supabase.rpc('rpc_recolher_loot', {
              p_loot_id: loot.id,
              p_player_id: walletAddress
            });

            if (error) {
              collectedRef.current.delete(loot.id);
              setLootItems(prev => {
                const next = [...prev, loot];
                lootItemsRef.current = next;
                return next;
              });
            } else {
              const sucesso = data?.sucesso === true || data?.success === true;
              const valor = Number(data?.valor ?? data?.amount ?? 0);
              const tipo = (data?.tipo ?? 'TOKENS').toUpperCase();

              let label = '✨ Recolhido!';
              if (tipo === 'TOKENS') label = `+${valor} $HASH`;
              else if (tipo === 'CHIPS') label = `+${valor} Microchips`;
              else if (tipo === 'STAMINA') label = `+${valor} Energia`;

              setFloatingRewards(prev => [...prev, { id: Date.now(), x: ax, y: ay - 30, text: label, type: tipo }]);
              if (sucesso && onLootCollected) onLootCollected(valor);
            }
          } catch (err) {
            collectedRef.current.delete(loot.id);
          }
        })();

        break;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMoving, walletAddress, mvX, mvY]);

  // ── Movimentar avatar para destino — interrompível ──────────────────
  const moveTo = useCallback((destX, destY, visitPlayer = null, lootId = null) => {
    if (!walletAddress) return;

    const curX = mvX.get();
    const curY = mvY.get();
    const dx = destX - curX;
    const dy = destY - curY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    // Cancela animação anterior imediatamente — dispara poeira se estava a mover
    if (activeAnimRef.current) {
      activeAnimRef.current.stop();
      activeAnimRef.current = null;
      setInterrupted(true);
      setTimeout(() => setInterrupted(false), 50);
    }

    // Velocidade dinâmica: ~150px/s, min 0.5s, max 8s
    const duration = Math.min(8, Math.max(0.5, dist / 150));

    // Calcula isFlipped e directionY imediatamente
    const flipped = destX < curX;
    const vertDist = destY - curY;
    const dirY = Math.abs(vertDist) > 10 ? (vertDist < 0 ? -1 : 1) : 0;

    pendingVisitRef.current = visitPlayer;
    targetPosRef.current = { x: destX, y: destY };
    setIsMoving(true);

    // Anima com MotionValues — pode ser interrompida (60fps local, independente de rede)
    const animX = animate(mvX, destX, { type: 'tween', duration, ease: 'linear' });
    const animY = animate(mvY, destY, {
      type: 'tween', duration, ease: 'linear',
      onUpdate: (latest) => {
        // Throttle de 150ms para broadcast (fluidez) e 1000ms para RPC (créditos)
        const now = Date.now();
        if (now - lastSyncTimeRef.current >= 150) {
          const x = mvX.get();
          const y = mvY.get();

          // Broadcast local a cada 150ms (sem await)
          supabase.channel('cidade').send({
            type: 'broadcast',
            event: 'moverse',
            payload: { id: walletAddress, x, y, movendo: true }
          });

          // RPC na BD apenas a cada 1000ms (poupar créditos)
          if (now - lastSyncTimeRef.current >= 1000) {
            lastSyncTimeRef.current = now;
            (async () => {
              try {
                await supabase.rpc('rpc_sincronizar_movimento', {
                  p_movendo: true,
                  p_user_id: walletAddress,
                  p_x: x,
                  p_y: y,
                  p_direcao_y: 0
                });
              } catch (err) {
                // Silencioso
              }
            })();
          } else {
            lastSyncTimeRef.current = now;
          }
        }
      },
      onComplete: () => {
        // Só dispara arrival se ainda é este destino
        if (
          Math.abs(mvX.get() - destX) < 5 &&
          Math.abs(mvY.get() - destY) < 5 &&
          targetPosRef.current.x === destX &&
          targetPosRef.current.y === destY
        ) {
          activeAnimRef.current = null;
          setIsMoving(false);

          // Gravação final: marca avatar como "estacionado" nesta posição (CRÍTICA)
          const finalX = destX;
          const finalY = destY;
          const deltaX = Math.abs(finalX - lastSavedPosRef.current.x);
          const deltaY = Math.abs(finalY - lastSavedPosRef.current.y);

          // Só grava se moveu mais de 5px da última gravação
          if (deltaX > 5 || deltaY > 5) {
            lastSavedPosRef.current = { x: finalX, y: finalY };
            (async () => {
              try {
                await supabase.rpc('rpc_sincronizar_movimento', {
                  p_movendo: false,
                  p_user_id: walletAddress,
                  p_x: finalX,
                  p_y: finalY,
                  p_direcao_y: 0
                });
              } catch (err) {
                localStorage.setItem('last_pos', JSON.stringify({ x: finalX, y: finalY, timestamp: Date.now() }));
              }
            })();
          }

          // Recolher loot se destino é prenda (fallback — async, sem bloquear)
          if (lootId && !collectedRef.current.has(lootId)) {
            collectedRef.current.add(lootId);
            setLootItems(prev => {
              const next = prev.filter(l => l.id !== lootId);
              lootItemsRef.current = next;
              return next;
            });
            (async () => {
              try {
                const { data, error } = await supabase.rpc('rpc_recolher_loot', {
                  p_loot_id: lootId,
                  p_player_id: walletAddress
                });

                if (error) {
                  collectedRef.current.delete(lootId);
                } else {
                  const sucesso = data?.sucesso === true || data?.success === true;
                  const valor = Number(data?.valor ?? data?.amount ?? 0);
                  const tipo = (data?.tipo ?? 'TOKENS').toUpperCase();

                  let label = '✨ Recolhido!';
                  if (tipo === 'TOKENS') label = `+${valor} $HASH`;
                  else if (tipo === 'CHIPS') label = `+${valor} Microchips`;
                  else if (tipo === 'STAMINA') label = `+${valor} Energia`;

                  const cx = mvX.get(), cy = mvY.get();
                  setFloatingRewards(prev => [...prev, { id: Date.now(), x: cx, y: cy - 30, text: label, type: tipo }]);
                  if (sucesso && onLootCollected) onLootCollected(valor);
                }
              } catch (err) {
                collectedRef.current.delete(lootId);
              }
            })();
          }

          const target = pendingVisitRef.current;
          if (target) {
            pendingVisitRef.current = null;
            setVisitTarget(target);
            setVisitModalOpen(true);
          }
        }
      },
    });
    // Guarda referência para cancelamento futuro
    activeAnimRef.current = { stop: () => { animX.stop(); animY.stop(); } };
  }, [walletAddress, mvX, mvY]);

  // ── Voltar à base ─────────────────────────────────────────────────────
  const handleReturnToBase = useCallback(() => {
    if (!walletAddress) return;
    const minhaCasa = houses.find(p => p.dono_id === walletAddress);
    if (!minhaCasa) return;

    const destX = minhaCasa.casa_pos_x ?? minhaCasa.x ?? 200;
    const destY = minhaCasa.casa_pos_y ?? minhaCasa.y ?? 200;

    // Centrar câmara na casa enquanto o avatar caminha
    const vw = viewportRef.current?.clientWidth || 800;
    const vh = viewportRef.current?.clientHeight || 500;
    const cx = Math.min(0, Math.max(-(WORLD_W - vw), -(destX - vw / 2)));
    const cy = Math.min(0, Math.max(-(WORLD_H - vh), -(destY - vh / 2)));
    setPan({ x: cx, y: cy });

    // Ping na casa
    setClickPing({ x: destX, y: destY, id: Date.now() });

    // Move sem pendingVisit (null = não abre modal)
    moveTo(destX, destY, null);
  }, [walletAddress, houses, moveTo]);

  // ── Clique no chão — move sem abrir modal (interrompível) ────────────
  const handleGroundClick = useCallback((e) => {
    if (isDragging.current || !walletAddress) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) - pan.x;
    const worldY = (e.clientY - rect.top) - pan.y;

    setClickPing({ x: worldX, y: worldY, id: Date.now() });
    moveTo(worldX, worldY, null);
  }, [walletAddress, pan, moveTo]);

  // ── Clique em edifício — move e depois abre modal ─────────────────────
  const handleBuildingClick = useCallback((e, player) => {
    e.stopPropagation();
    if (!walletAddress || isDragging.current) return;

    const destX = player.casa_pos_x ?? player.x ?? 200;
    const destY = player.casa_pos_y ?? player.y ?? 200;

    setClickPing({ x: destX, y: destY, id: Date.now() });
    moveTo(destX, destY, player);
  }, [walletAddress, moveTo]);

  // ── Clique em Loot (prenda) — desvia avatar para lá ──────────────────
  const handleLootClick = useCallback((e, loot) => {
    e.stopPropagation();
    if (!walletAddress || isDragging.current) return;

    const destX = loot.pos_x ?? loot.x ?? 0;
    const destY = loot.pos_y ?? loot.y ?? 0;

    setClickPing({ x: destX, y: destY, id: Date.now() });
    moveTo(destX, destY, null, loot.id);
  }, [walletAddress, moveTo]);

  function climaIcon(c) {
    if (c === 'CHUVA') return '🌧️';
    if (c === 'ENSOLARADO') return '☀️';
    if (c === 'CALOR_EXTREMO') return '🔥';
    return '🌤️';
  }
  function climaLabel(c) {
    if (c === 'CHUVA') return 'Chuva';
    if (c === 'ENSOLARADO') return 'Ensolarado';
    if (c === 'CALOR_EXTREMO') return 'Calor Extremo';
    return c;
  }

  const remoteList = Object.values(remotePlayers);

  return (
    <>
      <div className={cn('relative rounded-2xl overflow-hidden bg-slate-950 select-none', className)}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-slate-900/95 to-transparent pointer-events-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Hash City</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {remoteList.filter(p => p.is_online).length + 1} online · {houses.length} casas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {clima && (
                <div className="flex items-center gap-1.5 bg-slate-800/80 rounded-lg px-3 py-2 text-xs border border-slate-700/50 pointer-events-auto">
                  <span>{climaIcon(clima)}</span>
                  <span className="text-slate-300 font-medium">{climaLabel(clima)}</span>
                </div>
              )}
              <div className="bg-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-400 pointer-events-auto flex items-center gap-1.5">
                {isMoving ? '🚶 A caminhar...' : <><Move className="w-3 h-3" /> Arrasta para explorar</>}
              </div>
            </div>
          </div>
        </div>

        {/* Viewport com drag */}
        <div
          ref={viewportRef}
          className="relative w-full"
          style={{
            height: 500,
            overflow: 'hidden',
            cursor: isDragging.current ? 'grabbing' : 'grab',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Mundo — mínimo 1000x1000, arrasta para ver o resto */}
          <div
            onClick={handleGroundClick}
            style={{
              position: 'absolute',
              width: WORLD_W,
              height: WORLD_H,
              minWidth: MIN_WORLD_W,
              minHeight: MIN_WORLD_H,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
              backgroundImage: `
                radial-gradient(circle at 20% 80%, rgba(16,185,129,0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(6,182,212,0.03) 0%, transparent 50%),
                linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px),
                linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '100% 100%, 100% 100%, 80px 80px, 80px 80px, 20px 20px, 20px 20px',
              backgroundColor: '#050a0f',
            }}
          >
            <WeatherOverlay clima={clima} />

            {/* Reflexo de chuva no chão */}
            {clima === 'CHUVA' && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                background: 'linear-gradient(to bottom, transparent 60%, rgba(6,182,212,0.04) 100%)',
                backdropFilter: 'brightness(0.92)',
              }} />
            )}

            {/* Estradas */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.1 }}>
              {[300, 700, 1100, 1500, 1900, 2300, 2700, 3100, 3500].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2={WORLD_W} y2={y} stroke="rgba(148,163,184,0.6)" strokeWidth="6" />
              ))}
              {[300, 700, 1100, 1500, 1900, 2300, 2700, 3100, 3500].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2={WORLD_H} stroke="rgba(148,163,184,0.6)" strokeWidth="6" />
              ))}
            </svg>

            {loading || profileLoading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="text-slate-400 text-sm">A carregar cidade...</span>
              </div>
            ) : (
              <>
                {/* CAMADA 0 — Objetos cidade (candeeiros, postes, caixas) */}
                <CityObjects onLootClick={handleLootClick} lootItems={lootItems} maxLoot={maxLoot} />

                {/* CAMADA 1 — Edifícios (z-index: 1) */}
                {houses.map((player, idx) => {
                  const isOwn = player.dono_id === walletAddress;
                  return (
                    <PlayerBuilding
                      key={player.dono_id || idx}
                      player={player}
                      isOwn={isOwn}
                      clima={clima}
                      onClick={isOwn ? undefined : (e) => handleBuildingClick(e, player)}
                    />
                  );
                })}

                {/* CAMADA 2 — Avatares remotos (z-index: 10) */}
                {remoteList.map(p => (
                  <RemoteAvatar
                    key={p.id}
                    player={p}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging.current) {
                        setVisitTarget({ ...p, dono_id: p.id });
                        setVisitModalOpen(true);
                      }
                    }}
                  />
                ))}

                {/* CAMADA 3 — Meu avatar (z-index: 50) — só renderiza APÓS perfil carregar */}
                {walletAddress && profileData && !profileLoading && (
                  <MyAvatar mvX={mvX} mvY={mvY} isMoving={isMoving} interrupted={interrupted} username={profileData.nome_utilizador || walletAddress.slice(0, 6)} profileData={profileData} targetPosRef={targetPosRef} />
                )}

                {/* Textos flutuantes de recompensa */}
                <AnimatePresence>
                  {floatingRewards.map(r => (
                    <FloatingReward
                      key={r.id}
                      x={r.x}
                      y={r.y}
                      text={r.text}
                      type={r.type || 'TOKENS'}
                      onDone={() => setFloatingRewards(prev => prev.filter(f => f.id !== r.id))}
                    />
                  ))}
                </AnimatePresence>

                {/* Ping visual no local do clique */}
                <AnimatePresence>
                  {clickPing && (
                    <motion.div
                      key={clickPing.id}
                      style={{
                        position: 'absolute',
                        left: clickPing.x,
                        top: clickPing.y,
                        translateX: '-50%',
                        translateY: '-50%',
                        zIndex: 40,
                        pointerEvents: 'none',
                      }}
                      initial={{ opacity: 1, scale: 0.3 }}
                      animate={{ opacity: 0, scale: 2.5 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      onAnimationComplete={() => setClickPing(null)}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '2px solid rgba(6,182,212,0.9)',
                        boxShadow: '0 0 10px rgba(6,182,212,0.6)',
                      }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Botão Retorno à Base */}
        {walletAddress && (
          <button
            onClick={handleReturnToBase}
            className="absolute bottom-14 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(6,10,22,0.92)',
              border: '1px solid rgba(6,182,212,0.6)',
              color: '#67e8f9',
              boxShadow: '0 0 12px rgba(6,182,212,0.25)',
            }}
            onMouseEnter={e => { if (!isMoving) e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 12px rgba(6,182,212,0.25)'; }}
          >
            <Home className="w-3.5 h-3.5" />
            Minha Base
          </button>
        )}

        {/* Legenda */}
        <div className="absolute bottom-4 right-4 flex items-center gap-4 text-xs bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50 z-10">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Tu</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> Jogador</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Online</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Offline</span>
        </div>
      </div>

      {/* Modal só monta quando visitTarget existe E visitModalOpen é true */}
      {visitModalOpen && visitTarget && (
        <VisitWarehouseModal
          isOpen={true}
          onClose={() => { setVisitModalOpen(false); setVisitTarget(null); }}
          player={visitTarget}
          currentPlayerWallet={walletAddress || currentPlayer?.wallet_address}
        />
      )}
    </>
  );
}
