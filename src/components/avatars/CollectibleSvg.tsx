import type { ReactNode } from "react";
import { COLLECTIBLE_BY_ID, type CollectibleSlot } from "@/lib/collectibles/catalog";

const INK = "#2b211a";

const SLOT_VIEWBOX: Record<CollectibleSlot, string> = {
  hat: "4 -14 36 32",
  eyewear: "10 13 24 17",
  pet: "30 -10 30 30",
};

function renderHat(itemId: string): ReactNode {
  switch (itemId) {
    case "space_cadet_cap":
      return (
        <>
          <path
            d="M11 11C11.5 3.5 16 0 22 0C28 0 32.5 3.5 33 11Z"
            fill="#1e3a8a"
            stroke={INK}
            strokeWidth={0.9}
          />
          <path
            d="M9.5 10.5Q22 7.8 35.5 11.2Q24 13.4 9.5 10.5Z"
            fill="#38bdf8"
            stroke={INK}
            strokeWidth={0.85}
          />
          <polygon
            points="22,2.6 22.9,4.7 25.1,4.8 23.4,6.2 24,8.4 22,7.1 20,8.4 20.6,6.2 18.9,4.8 21.1,4.7"
            fill="#fde047"
          />
        </>
      );
    case "space_astro_helmet":
      return (
        <>
          <path
            d="M9.5 14C9.5 2.5 15 -4.5 22 -4.5C29 -4.5 34.5 2.5 34.5 14"
            fill="rgba(186,230,253,0.34)"
            stroke="#e2e8f0"
            strokeWidth={1.3}
          />
          <path
            d="M12.5 3.5Q16 -1.5 21 -2"
            fill="none"
            stroke="#fff"
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.8}
          />
          <line x1={22} y1={-4.5} x2={22} y2={-9} stroke="#94a3b8" strokeWidth={1.1} />
          <circle cx={22} cy={-9.5} r={1.6} fill="#38bdf8" stroke={INK} strokeWidth={0.6} />
          <path
            d="M10.5 12.2Q22 9.5 33.5 12.2"
            fill="none"
            stroke="#fbbf24"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </>
      );
    case "animals_cat_ears":
      return (
        <>
          <path d="M11 11L12.5 0.5L18.5 7.5Z" fill="#d97706" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M12.4 8.5L13.3 2.8L16.8 7Z" fill="#fda4af" />
          <path d="M33 11L31.5 0.5L25.5 7.5Z" fill="#d97706" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
          <path d="M31.6 8.5L30.7 2.8L27.2 7Z" fill="#fda4af" />
        </>
      );
    case "animals_frog_hood":
      return (
        <>
          <path
            d="M10.5 12C10.5 4.5 15.5 1 22 1C28.5 1 33.5 4.5 33.5 12Z"
            fill="#22c55e"
            stroke={INK}
            strokeWidth={0.9}
          />
          <circle cx={16} cy={2} r={3.2} fill="#4ade80" stroke={INK} strokeWidth={0.85} />
          <circle cx={28} cy={2} r={3.2} fill="#4ade80" stroke={INK} strokeWidth={0.85} />
          <circle cx={16} cy={2} r={1.6} fill="#fff" />
          <circle cx={28} cy={2} r={1.6} fill="#fff" />
          <circle cx={16.3} cy={2} r={0.85} fill={INK} />
          <circle cx={28.3} cy={2} r={0.85} fill={INK} />
        </>
      );
    case "cooking_chef_toque":
      return (
        <>
          <path
            d="M13 8C10 6.5 10.5 1 15 1.2C16.5 -2.5 27.5 -2.5 29 1.2C33.5 1 34 6.5 31 8Z"
            fill="#ffffff"
            stroke={INK}
            strokeWidth={0.9}
          />
          <rect x={13.5} y={7.5} width={17} height={3.5} rx={1} fill="#f1f5f9" stroke={INK} strokeWidth={0.85} />
          <line x1={18} y1={2} x2={18} y2={6.5} stroke="#cbd5e1" strokeWidth={0.8} strokeLinecap="round" />
          <line x1={22} y1={1} x2={22} y2={6.5} stroke="#cbd5e1" strokeWidth={0.8} strokeLinecap="round" />
          <line x1={26} y1={2} x2={26} y2={6.5} stroke="#cbd5e1" strokeWidth={0.8} strokeLinecap="round" />
        </>
      );
    case "cooking_gold_toque":
      return (
        <>
          <path
            d="M12.5 8C9 5.5 10 -2.5 15 -2C17.5 -6.5 26.5 -6.5 29 -2C34 -2.5 35 5.5 31.5 8Z"
            fill="#fffbeb"
            stroke={INK}
            strokeWidth={0.9}
          />
          <rect x={13} y={7.4} width={18} height={3.8} rx={1} fill="#f59e0b" stroke={INK} strokeWidth={0.85} />
          <circle cx={22} cy={9.3} r={1.2} fill="#fef08a" />
        </>
      );
    case "fashion_beret":
      return (
        <>
          <path
            d="M10 10.5C9.5 4.5 15.5 1 23.5 1.5C31 2 35 5.5 33.5 10.5Q22 8.2 10 10.5Z"
            fill="#e11d48"
            stroke={INK}
            strokeWidth={0.9}
          />
          <path d="M22.5 1.5L23.5 -1.5" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
        </>
      );
    case "fashion_tiara":
      return (
        <>
          <path
            d="M12.5 10L14.5 3.5L18.5 7L22 0.5L25.5 7L29.5 3.5L31.5 10Z"
            fill="#fde047"
            stroke={INK}
            strokeWidth={0.85}
            strokeLinejoin="round"
          />
          <circle cx={22} cy={6.2} r={1.4} fill="#f43f5e" />
          <circle cx={16} cy={7.8} r={0.9} fill="#38bdf8" />
          <circle cx={28} cy={7.8} r={0.9} fill="#38bdf8" />
        </>
      );
    case "music_beanie":
      return (
        <>
          <path
            d="M11 10.5C11.5 3 16 -0.5 22 -0.5C28 -0.5 32.5 3 33 10.5Z"
            fill="#7c3aed"
            stroke={INK}
            strokeWidth={0.9}
          />
          <circle cx={22} cy={-1.8} r={2.2} fill="#a78bfa" stroke={INK} strokeWidth={0.8} />
          <rect x={10.5} y={8.2} width={23} height={3.6} rx={1.6} fill="#5b21b6" stroke={INK} strokeWidth={0.85} />
          <line x1={15} y1={8.5} x2={15} y2={11.5} stroke="#c4b5fd" strokeWidth={0.7} />
          <line x1={22} y1={8.5} x2={22} y2={11.5} stroke="#c4b5fd" strokeWidth={0.7} />
          <line x1={29} y1={8.5} x2={29} y2={11.5} stroke="#c4b5fd" strokeWidth={0.7} />
        </>
      );
    case "music_headphones":
      return (
        <>
          <path
            d="M10.5 20C10.5 7 15.5 3 22 3C28.5 3 33.5 7 33.5 20"
            fill="none"
            stroke="#334155"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <rect x={8.2} y={16.5} width={3.6} height={7.5} rx={1.7} fill="#a855f7" stroke={INK} strokeWidth={0.85} />
          <rect x={32.2} y={16.5} width={3.6} height={7.5} rx={1.7} fill="#a855f7" stroke={INK} strokeWidth={0.85} />
        </>
      );
    case "games_pixel_cap":
      return (
        <>
          <path
            d="M12 10V4H16V2H28V4H32V10Z"
            fill="#ef4444"
            stroke={INK}
            strokeWidth={0.85}
            strokeLinejoin="miter"
          />
          <rect x={18} y={4.5} width={8} height={3.5} fill="#fff" />
          <rect x={10} y={9.5} width={24} height={2.5} fill="#1d4ed8" stroke={INK} strokeWidth={0.8} />
        </>
      );
    case "games_pixel_crown":
      return (
        <>
          <path
            d="M12 10V2H16V5H20V0H24V5H28V2H32V10Z"
            fill="#facc15"
            stroke={INK}
            strokeWidth={0.85}
            strokeLinejoin="miter"
          />
          <rect x={20.8} y={5.8} width={2.4} height={2.4} fill="#38bdf8" />
          <rect x={14.2} y={6.4} width={1.8} height={1.8} fill="#ef4444" />
          <rect x={28} y={6.4} width={1.8} height={1.8} fill="#ef4444" />
        </>
      );
    default:
      return null;
  }
}

function renderEyewear(itemId: string): ReactNode {
  switch (itemId) {
    case "space_star_visor":
      return (
        <>
          <path
            d="M12.5 19.2H31.5L30.5 23.8Q22 25 13.5 23.8Z"
            fill="rgba(56,189,248,0.68)"
            stroke="#0284c7"
            strokeWidth={0.95}
          />
          <line x1={14.5} y1={20.6} x2={19} y2={20.6} stroke="#e0f2fe" strokeWidth={0.9} strokeLinecap="round" />
        </>
      );
    case "space_nebula_goggles":
      return (
        <>
          <circle cx={17.5} cy={21.6} r={3.6} fill="rgba(168,85,247,0.55)" stroke="#fbbf24" strokeWidth={1.1} />
          <circle cx={26.5} cy={21.6} r={3.6} fill="rgba(56,189,248,0.55)" stroke="#fbbf24" strokeWidth={1.1} />
          <path d="M21.1 21.4H22.9" stroke="#fbbf24" strokeWidth={1.1} />
          <circle cx={16.5} cy={20.4} r={0.8} fill="#fff" opacity={0.8} />
          <circle cx={25.5} cy={20.4} r={0.8} fill="#fff" opacity={0.8} />
        </>
      );
    case "animals_safari_specs":
      return (
        <>
          <circle cx={17.6} cy={21.6} r={3.3} fill="rgba(254,243,199,0.28)" stroke="#92400e" strokeWidth={1.1} />
          <circle cx={26.4} cy={21.6} r={3.3} fill="rgba(254,243,199,0.28)" stroke="#92400e" strokeWidth={1.1} />
          <path d="M20.9 21.3H23.1" stroke="#92400e" strokeWidth={1.1} />
        </>
      );
    case "animals_owl_lenses":
      return (
        <>
          <circle cx={17.5} cy={21.6} r={3.8} fill="rgba(251,191,36,0.22)" stroke="#d97706" strokeWidth={1.2} />
          <circle cx={26.5} cy={21.6} r={3.8} fill="rgba(251,191,36,0.22)" stroke="#d97706" strokeWidth={1.2} />
          <path d="M13.5 18.8L16 17.4M30.5 18.8L28 17.4" stroke="#d97706" strokeWidth={1.1} strokeLinecap="round" />
          <path d="M21.3 21.6H22.7" stroke="#d97706" strokeWidth={1.1} />
        </>
      );
    case "cooking_steam_goggles":
      return (
        <>
          <rect x={13.5} y={18.8} width={7.2} height={5.4} rx={2.2} fill="rgba(186,230,253,0.45)" stroke="#475569" strokeWidth={1} />
          <rect x={23.3} y={18.8} width={7.2} height={5.4} rx={2.2} fill="rgba(186,230,253,0.45)" stroke="#475569" strokeWidth={1} />
          <path d="M20.7 21.3H23.3" stroke="#475569" strokeWidth={1.1} />
        </>
      );
    case "cooking_taste_monocle":
      return (
        <>
          <circle cx={26} cy={21.6} r={3.5} fill="rgba(254,240,138,0.28)" stroke="#eab308" strokeWidth={1.15} />
          <path d="M29.4 22.8Q30.8 25.8 29.8 29" fill="none" stroke="#eab308" strokeWidth={0.8} strokeDasharray="1.2 1" />
        </>
      );
    case "fashion_heart_shades":
      return (
        <>
          <path
            d="M17.6 24.4C15.2 23 14.2 21.2 14.6 19.7C15 18.4 16.6 18.3 17.6 19.6C18.6 18.3 20.2 18.4 20.6 19.7C21 21.2 20 23 17.6 24.4Z"
            fill="#fb7185"
            stroke="#be123c"
            strokeWidth={0.85}
          />
          <path
            d="M26.4 24.4C24 23 23 21.2 23.4 19.7C23.8 18.4 25.4 18.3 26.4 19.6C27.4 18.3 29 18.4 29.4 19.7C29.8 21.2 28.8 23 26.4 24.4Z"
            fill="#fb7185"
            stroke="#be123c"
            strokeWidth={0.85}
          />
          <path d="M20.7 20.6H23.3" stroke="#be123c" strokeWidth={0.9} />
        </>
      );
    case "fashion_prism_frames":
      return (
        <>
          <polygon points="14,19.4 20.4,19.4 19.5,24 15,24" fill="rgba(232,121,249,0.45)" stroke="#c026d3" strokeWidth={0.95} />
          <polygon points="23.6,19.4 30,19.4 29,24 24.5,24" fill="rgba(56,189,248,0.45)" stroke="#c026d3" strokeWidth={0.95} />
          <path d="M20.4 20.6H23.6" stroke="#c026d3" strokeWidth={1} />
        </>
      );
    case "music_retro_shades":
      return (
        <>
          <rect x={13.5} y={19.2} width={7.4} height={4.4} rx={1.1} fill="#1e1b4b" stroke="#f472b6" strokeWidth={0.9} />
          <rect x={23.1} y={19.2} width={7.4} height={4.4} rx={1.1} fill="#1e1b4b" stroke="#f472b6" strokeWidth={0.9} />
          <path d="M20.9 20.6H23.1" stroke="#f472b6" strokeWidth={0.95} />
          <line x1={14.5} y1={21.8} x2={19.8} y2={21.8} stroke="#22d3ee" strokeWidth={0.75} />
          <line x1={24.1} y1={21.8} x2={29.4} y2={21.8} stroke="#22d3ee" strokeWidth={0.75} />
        </>
      );
    case "music_eq_visor":
      return (
        <>
          <rect x={13} y={19} width={18} height={5} rx={1.6} fill="rgba(15,23,42,0.85)" stroke="#a855f7" strokeWidth={0.9} />
          <line x1={15.5} y1={22.8} x2={15.5} y2={20.4} stroke="#34d399" strokeWidth={1.1} strokeLinecap="round" />
          <line x1={18.5} y1={22.8} x2={18.5} y2={19.8} stroke="#38bdf8" strokeWidth={1.1} strokeLinecap="round" />
          <line x1={22} y1={22.8} x2={22} y2={20.8} stroke="#f472b6" strokeWidth={1.1} strokeLinecap="round" />
          <line x1={25.5} y1={22.8} x2={25.5} y2={19.8} stroke="#38bdf8" strokeWidth={1.1} strokeLinecap="round" />
          <line x1={28.5} y1={22.8} x2={28.5} y2={20.5} stroke="#34d399" strokeWidth={1.1} strokeLinecap="round" />
        </>
      );
    case "games_pixel_shades":
      return (
        <>
          <path d="M13 19.5H21V22.5H19V23.8H15V22.5H13Z" fill="#0f172a" />
          <path d="M23 19.5H31V22.5H29V23.8H25V22.5H23Z" fill="#0f172a" />
          <rect x={21} y={20.2} width={2} height={1.2} fill="#0f172a" />
          <rect x={14.2} y={20.3} width={1.5} height={1} fill="#fff" />
          <rect x={24.2} y={20.3} width={1.5} height={1} fill="#fff" />
        </>
      );
    case "games_vr_visor":
      return (
        <>
          <rect x={12.2} y={18.4} width={19.6} height={6} rx={2.2} fill="#1e293b" stroke="#38bdf8" strokeWidth={1} />
          <line x1={14} y1={21.4} x2={30} y2={21.4} stroke="#22d3ee" strokeWidth={0.7} opacity={0.8} />
          <line x1={22} y1={19} x2={22} y2={23.8} stroke="#22d3ee" strokeWidth={0.7} opacity={0.8} />
        </>
      );
    default:
      return null;
  }
}

function renderPet(itemId: string): ReactNode {
  switch (itemId) {
    case "space_mini_moon":
      return (
        <g className="wv-node-pet">
          <circle cx={45} cy={7} r={5.4} fill="#e2e8f0" stroke={INK} strokeWidth={0.8} />
          <circle cx={43.2} cy={5.4} r={1.1} fill="#94a3b8" />
          <circle cx={46.8} cy={8.4} r={1.4} fill="#94a3b8" />
          <ellipse cx={45} cy={7} rx={8.5} ry={2.2} transform="rotate(-20 45 7)" fill="none" stroke="#38bdf8" strokeWidth={0.9} />
        </g>
      );
    case "space_comet_ufo":
      return (
        <g className="wv-node-pet">
          <path d="M40.5 7.5C40.5 3.5 49.5 3.5 49.5 7.5Z" fill="#7dd3fc" stroke={INK} strokeWidth={0.75} />
          <ellipse cx={45} cy={8} rx={7.5} ry={2.4} fill="#fbbf24" stroke={INK} strokeWidth={0.8} />
          <circle cx={41.5} cy={8} r={0.8} fill="#ef4444" />
          <circle cx={45} cy={8.5} r={0.8} fill="#22c55e" />
          <circle cx={48.5} cy={8} r={0.8} fill="#38bdf8" />
        </g>
      );
    case "animals_tiny_bee":
      return (
        <g className="wv-node-pet">
          <ellipse cx={43.2} cy={3.5} rx={2.5} ry={1.6} fill="rgba(224,242,254,0.88)" stroke={INK} strokeWidth={0.6} />
          <ellipse cx={46.8} cy={3.5} rx={2.5} ry={1.6} fill="rgba(224,242,254,0.88)" stroke={INK} strokeWidth={0.6} />
          <ellipse cx={45} cy={7.2} rx={4.6} ry={3.4} fill="#facc15" stroke={INK} strokeWidth={0.8} />
          <line x1={43.5} y1={4.2} x2={43.5} y2={10.2} stroke={INK} strokeWidth={1.1} />
          <line x1={46.5} y1={4.2} x2={46.5} y2={10.2} stroke={INK} strokeWidth={1.1} />
        </g>
      );
    case "animals_mini_dragon":
      return (
        <g className="wv-node-pet">
          <path d="M39.5 6.5L36.5 3.5L38.5 8.5Z" fill="#f97316" stroke={INK} strokeWidth={0.65} />
          <circle cx={45.5} cy={7.2} r={4.4} fill="#10b981" stroke={INK} strokeWidth={0.8} />
          <path d="M43 3.2L41.8 0.5L44.6 2.8Z" fill="#fbbf24" stroke={INK} strokeWidth={0.65} />
          <path d="M48 3.2L49.2 0.5L46.4 2.8Z" fill="#fbbf24" stroke={INK} strokeWidth={0.65} />
          <circle cx={44.2} cy={6.6} r={0.85} fill="#fef08a" />
          <circle cx={47} cy={6.6} r={0.85} fill="#fef08a" />
        </g>
      );
    case "cooking_cupcake_sprite":
      return (
        <g className="wv-node-pet">
          <path d="M40.5 8H49.5L48.3 13H41.7Z" fill="#f59e0b" stroke={INK} strokeWidth={0.8} />
          <path d="M39.5 8C39.5 4 50.5 4 50.5 8Z" fill="#f472b6" stroke={INK} strokeWidth={0.8} />
          <circle cx={45} cy={3.3} r={1.6} fill="#ef4444" stroke={INK} strokeWidth={0.65} />
        </g>
      );
    case "cooking_phoenix_whisk":
      return (
        <g className="wv-node-pet">
          <path d="M45 1C41 4.5 41.5 9 45 9C48.5 9 49 4.5 45 1Z" fill="#fbbf24" opacity={0.85} />
          <ellipse cx={45} cy={5.6} rx={2.6} ry={4.2} fill="none" stroke="#f97316" strokeWidth={0.95} />
          <ellipse cx={45} cy={5.6} rx={1.3} ry={4.2} fill="none" stroke="#fde047" strokeWidth={0.8} />
          <rect x={44.1} y={9.5} width={1.8} height={4.2} rx={0.8} fill="#b45309" stroke={INK} strokeWidth={0.65} />
        </g>
      );
    case "fashion_ribbon_bow":
      return (
        <g className="wv-node-pet">
          <path d="M45 7L39 3.5V10.5Z" fill="#f472b6" stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
          <path d="M45 7L51 3.5V10.5Z" fill="#f472b6" stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
          <circle cx={45} cy={7} r={1.8} fill="#fff1f2" stroke={INK} strokeWidth={0.75} />
        </g>
      );
    case "fashion_crystal_star":
      return (
        <g className="wv-node-pet">
          <polygon
            points="45,0.5 46.8,5.2 51.8,5.5 47.9,8.7 49.2,13.6 45,10.8 40.8,13.6 42.1,8.7 38.2,5.5 43.2,5.2"
            fill="#f472b6"
            stroke="#fde047"
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <circle cx={45} cy={7.2} r={1.4} fill="#fff" opacity={0.85} />
        </g>
      );
    case "music_note_sprite":
      return (
        <g className="wv-node-pet">
          <ellipse cx={42.2} cy={10.5} rx={2.4} ry={1.8} fill="#c084fc" stroke={INK} strokeWidth={0.75} />
          <ellipse cx={48.2} cy={9.3} rx={2.4} ry={1.8} fill="#c084fc" stroke={INK} strokeWidth={0.75} />
          <path d="M44.2 10.2V3.2L50.2 2V9" fill="none" stroke="#a855f7" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "music_vinyl_orb":
      return (
        <g className="wv-node-pet">
          <circle cx={45} cy={7} r={5.6} fill="#1e293b" stroke="#fbbf24" strokeWidth={1} />
          <circle cx={45} cy={7} r={3.6} fill="none" stroke="#475569" strokeWidth={0.6} />
          <circle cx={45} cy={7} r={2} fill="#fbbf24" />
          <circle cx={45} cy={7} r={0.65} fill="#1e293b" />
        </g>
      );
    case "games_pixel_ghost":
      return (
        <g className="wv-node-pet">
          <path
            d="M40.5 11.5V5.5C40.5 2.8 42.5 1 45 1C47.5 1 49.5 2.8 49.5 5.5V11.5L48 10L46.5 11.5L45 10L43.5 11.5L42 10Z"
            fill="#22d3ee"
            stroke={INK}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <rect x={42.4} y={4.8} width={1.8} height={2} fill="#fff" />
          <rect x={46} y={4.8} width={1.8} height={2} fill="#fff" />
          <rect x={43.1} y={5.4} width={0.9} height={1} fill={INK} />
          <rect x={46.7} y={5.4} width={0.9} height={1} fill={INK} />
        </g>
      );
    case "games_golden_controller":
      return (
        <g className="wv-node-pet">
          <rect x={39} y={4} width={12} height={6.6} rx={3} fill="#fbbf24" stroke={INK} strokeWidth={0.8} />
          <path d="M41.5 7.3H43.5M42.5 6.3V8.3" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
          <circle cx={47.2} cy={6.6} r={0.75} fill="#ef4444" />
          <circle cx={48.6} cy={7.8} r={0.75} fill="#38bdf8" />
        </g>
      );
    default:
      return null;
  }
}

export function CollectibleOverlay({ itemId }: { itemId: string }) {
  const item = COLLECTIBLE_BY_ID.get(itemId);
  if (!item) return null;

  let content: ReactNode = null;
  if (item.slot === "hat") content = renderHat(itemId);
  else if (item.slot === "eyewear") content = renderEyewear(itemId);
  else if (item.slot === "pet") content = renderPet(itemId);

  if (!content) return null;
  return <g data-equipped-item={itemId}>{content}</g>;
}

export function CollectibleIcon({
  itemId,
  locked = false,
  className,
}: {
  itemId: string;
  locked?: boolean;
  className?: string;
}) {
  const item = COLLECTIBLE_BY_ID.get(itemId);
  const slot: CollectibleSlot = item?.slot ?? "hat";
  const viewBox = SLOT_VIEWBOX[slot];

  return (
    <svg
      viewBox={viewBox}
      className={className}
      aria-hidden="true"
      focusable="false"
      style={
        locked
          ? { filter: "grayscale(1) brightness(0.32)", opacity: 0.55 }
          : undefined
      }
    >
      <CollectibleOverlay itemId={itemId} />
    </svg>
  );
}
