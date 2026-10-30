import React, { useRef, useMemo } from 'react';
import { Palette, Sparkles, RotateCcw, Copy, Check } from 'lucide-react';

export interface MotdDesignerProps {
  value: string;
  onChange: (value: string) => void;
  serverName?: string;
  maxPlayers?: number;
  onlineCount?: number;
}

const MINECRAFT_COLORS = [
  { code: '0', name: 'Negro', hex: '#000000', textLight: true },
  { code: '1', name: 'Azul Oscuro', hex: '#0000AA', textLight: true },
  { code: '2', name: 'Verde Oscuro', hex: '#00AA00', textLight: true },
  { code: '3', name: 'Aqua Oscuro', hex: '#00AAAA', textLight: true },
  { code: '4', name: 'Rojo Oscuro', hex: '#AA0000', textLight: true },
  { code: '5', name: 'Púrpura', hex: '#AA00AA', textLight: true },
  { code: '6', name: 'Oro', hex: '#FFAA00', textLight: false },
  { code: '7', name: 'Gris', hex: '#AAAAAA', textLight: false },
  { code: '8', name: 'Gris Oscuro', hex: '#555555', textLight: true },
  { code: '9', name: 'Azul', hex: '#5555FF', textLight: true },
  { code: 'a', name: 'Verde', hex: '#55FF55', textLight: false },
  { code: 'b', name: 'Aqua', hex: '#55FFFF', textLight: false },
  { code: 'c', name: 'Rojo', hex: '#FF5555', textLight: false },
  { code: 'd', name: 'Rosa', hex: '#FF55FF', textLight: false },
  { code: 'e', name: 'Amarillo', hex: '#FFFF55', textLight: false },
  { code: 'f', name: 'Blanco', hex: '#FFFFFF', textLight: false }
];

const MINECRAFT_FORMATS = [
  { code: 'l', name: 'Negrita', style: 'font-weight: bold;' },
  { code: 'm', name: 'Tachado', style: 'text-decoration: line-through;' },
  { code: 'n', name: 'Subrayado', style: 'text-decoration: underline;' },
  { code: 'o', name: 'Cursiva', style: 'font-style: italic;' },
  { code: 'r', name: 'Resetear', style: 'reset' }
];

const MOTD_TEMPLATES = [
  {
    name: 'Survival Vanilla',
    text: '§a§lNebulaX §f| §eSurvival 1.21 §7[§a1.21.x§7]\n§7» §b¡Comunidad activa, economía y clanes!'
  },
  {
    name: 'Cyberpunk Glow',
    text: '§b§l⚡ SINGULARITY NETWORK ⚡\n§d§lMODPACK ACTIVO §8» §fDisfruta la experiencia espacial'
  },
  {
    name: 'Minimalista Elegante',
    text: '§fUn servidor de §6Minecraft §fgestionado con §aSingularity\n§8Haz clic para unirte a la aventura...'
  }
];

export const MotdDesigner: React.FC<MotdDesignerProps> = ({
  value,
  onChange,
  serverName = 'Minecraft Server',
  maxPlayers = 20,
  onlineCount = 0
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Inserts a code (§x or &x) at current cursor position in the textarea
  const insertCode = (code: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + `§${code}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prefix = `§${code}`;
    const nextVal = value.substring(0, start) + prefix + value.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert raw Minecraft MOTD string (& or §) into styled HTML spans
  const renderedHtml = useMemo(() => {
    if (!value) {
      return '<span style="color: #AAAAAA;">A Minecraft Server</span>';
    }

    // Normalize \n or literal escaped \\n into newline
    const cleanLines = value.replace(/\\n/g, '\n').split('\n');

    const linesHtml = cleanLines.map((line) => {
      const normalized = line.replace(/&([0-9a-fk-or])/gi, '§$1');
      const tokens = normalized.split(/(§[0-9a-fk-or])/gi);

      let currentColor = '#FFFFFF';
      const currentFormats = new Set<string>();
      const parts: string[] = [];

      for (const token of tokens) {
        if (!token) continue;

        if (token.startsWith('§')) {
          const code = token.charAt(1).toLowerCase();
          const colorObj = MINECRAFT_COLORS.find((c) => c.code === code);
          if (colorObj) {
            currentColor = colorObj.hex;
            currentFormats.clear();
          } else if (code === 'r') {
            currentColor = '#FFFFFF';
            currentFormats.clear();
          } else {
            const formatObj = MINECRAFT_FORMATS.find((f) => f.code === code);
            if (formatObj && formatObj.style !== 'reset') {
              currentFormats.add(formatObj.style);
            }
          }
        } else {
          const style = [`color: ${currentColor};`, ...Array.from(currentFormats)].join(' ');
          const escaped = token
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          parts.push(`<span style="${style}">${escaped}</span>`);
        }
      }

      return `<div class="leading-snug min-h-[1.25rem]">${parts.join('') || '&nbsp;'}</div>`;
    });

    return linesHtml.join('');
  }, [value]);

  return (
    <div className="space-y-4">
      {/* Minecraft In-Game Server List Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Vista Previa en Lista de Servidores (Multijugador)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Simulación fiel cliente Minecraft</span>
        </div>

        <div className="bg-[#121212] border-2 border-[#2b2b2b] rounded-lg p-3 text-slate-200 font-mono flex items-start gap-3.5 shadow-2xl relative overflow-hidden select-none">
          {/* Server Icon Box (Grass Block Styled Placeholder) */}
          <div className="w-16 h-16 shrink-0 bg-nebula-800 rounded border border-nebula-700 flex flex-col items-center justify-center p-1 relative shadow-inner">
            <div className="w-full h-1/2 bg-emerald-600 rounded-t-sm border-b-2 border-emerald-700 flex items-center justify-center">
              <div className="w-2 h-2 bg-emerald-400 rounded-full opacity-60"></div>
            </div>
            <div className="w-full h-1/2 bg-amber-900 rounded-b-sm flex items-center justify-center">
              <span className="text-[10px] font-bold text-amber-200/60 font-mono tracking-tighter">MC</span>
            </div>
          </div>

          {/* Server Metadata and MOTD */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1 mb-1.5">
              <div className="font-bold text-sm tracking-wide text-white truncate">
                {serverName}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                {/* Ping latency simulation */}
                <div className="flex items-end gap-0.5 h-3" title="Ping: 18ms">
                  <span className="w-1 h-1 bg-emerald-500 rounded-sm"></span>
                  <span className="w-1 h-1.5 bg-emerald-500 rounded-sm"></span>
                  <span className="w-1 h-2 bg-emerald-500 rounded-sm"></span>
                  <span className="w-1 h-2.5 bg-emerald-500 rounded-sm"></span>
                  <span className="w-1 h-3 bg-emerald-500 rounded-sm"></span>
                </div>
                <span className="text-slate-400 text-xs font-semibold">
                  <span className="text-slate-200">{onlineCount}</span>
                  <span className="text-slate-500"> / </span>
                  <span className="text-slate-400">{maxPlayers}</span>
                </span>
              </div>
            </div>

            {/* Rendered HTML MOTD Lines */}
            <div
              className="text-xs tracking-normal font-mono select-text"
              style={{
                textShadow: '1px 1px 0px rgba(0,0,0,0.85)',
                fontFamily: 'Consolas, "Courier New", Courier, monospace'
              }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </div>
      </div>

      {/* Formatting & Color Palette Toolbar */}
      <div className="bg-nebula-900 border border-nebula-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Palette className="w-3.5 h-3.5 text-nebula-accent" />
            <span>Paleta de Colores y Formatos (§ / &)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copyToClipboard}
              className="p-1.5 rounded-lg bg-nebula-800 hover:bg-nebula-750 text-slate-400 hover:text-slate-200 transition-colors text-xs flex items-center gap-1"
              title="Copiar texto con códigos"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg bg-nebula-800 hover:bg-nebula-750 text-slate-400 hover:text-rose-400 transition-colors text-xs flex items-center gap-1"
              title="Limpiar MOTD"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Limpiar</span>
            </button>
          </div>
        </div>

        {/* Color buttons */}
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
          {MINECRAFT_COLORS.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => insertCode(c.code)}
              style={{ backgroundColor: c.hex }}
              className={`h-7 rounded flex items-center justify-center text-xs font-mono font-bold shadow-sm border border-black/30 hover:scale-110 active:scale-95 transition-transform ${
                c.textLight ? 'text-white' : 'text-slate-900'
              }`}
              title={`Color ${c.name} (§${c.code})`}
            >
              §{c.code}
            </button>
          ))}
        </div>

        {/* Format buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-nebula-800/60">
          {MINECRAFT_FORMATS.map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => insertCode(f.code)}
              className="px-2.5 py-1 rounded bg-nebula-850 hover:bg-nebula-800 border border-nebula-700 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-colors flex items-center gap-1"
            >
              <span className="text-nebula-accent font-bold">§{f.code}</span>
              <span className="text-[11px] text-slate-400 font-sans">{f.name}</span>
            </button>
          ))}
        </div>

        {/* Quick Templates */}
        <div className="pt-2 border-t border-nebula-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 shrink-0 font-medium">Plantillas rápidas:</span>
          {MOTD_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              type="button"
              onClick={() => onChange(tmpl.text)}
              className="px-2 py-0.5 rounded bg-nebula-800 hover:bg-nebula-750 text-slate-300 hover:text-nebula-accent border border-nebula-700/50 whitespace-nowrap transition-colors"
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* Raw MOTD Text Editor */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300">
          Texto MOTD (Soporta salto de línea con Enter o <code className="text-nebula-accent">\n</code>)
        </label>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="§a¡Bienvenido a mi servidor de Minecraft!\n§7Únete con la versión 1.21.x"
          className="w-full px-3 py-2 rounded-lg bg-nebula-950 border border-nebula-750 text-slate-200 text-xs font-mono focus:outline-none focus:border-nebula-accent transition-colors resize-y"
        />
        <p className="text-[11px] text-slate-500">
          Tip: Minecraft permite hasta 2 líneas en la lista de servidores. Usa Enter para separar los renglones.
        </p>
      </div>
    </div>
  );
};
