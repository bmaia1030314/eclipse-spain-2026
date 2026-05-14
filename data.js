/*
 * data.js
 *
 * Conteúdo editável da aplicação.
 *
 * Estrutura:
 *   - audio / audioCues / checklist / expectations / notes / timeline / meteo:
 *     conteúdo PARTILHADO entre planos. Os textos podem usar {base} (substituído
 *     pelo nome da cidade-base do plano activo) e {region} (nome da região).
 *
 *   - plans.leon / plans.caxado:
 *     conteúdo ESPECÍFICO de cada plano (base, eclipse, fases, spots, hotéis,
 *     matriz de decisão, opções de meteo).
 *
 *   - i18n.pt / i18n.en:
 *     traduções (PT por defeito).
 *
 * Para adicionar/alterar conteúdo basta editar este ficheiro e correr
 * `node build-bundle.js` para regenerar `eclipse-leon-2026.html`.
 */

window.APP_DATA = {

  // ===================================================================
  // CONTEÚDO PARTILHADO (igual em ambos os planos)
  // ===================================================================

  // ---------- Cues de áudio (Web Speech API) ----------
  // Cada cue dispara `offsetSec` segundos antes/depois da fase indicada
  // (refPhase = C1 | C2 | Max | C3 | Pôr). catchupSec = janela após o momento
  // em que ainda faz sentido disparar (se o tab esteve suspenso).
  // staleText* é falado se o cue chegou atrasado.
  // textPt/textEn aceitam {base} → cidade-base do plano activo (ex. "León").
  audio: {
    previewPauseMs: 1500,
    preferredVoicePt: ["Microsoft Helia", "Microsoft Duarte", "Joana", "Cristiano", "Google português"],
    preferredVoiceEn: ["Microsoft Aria", "Google UK English Female", "Samantha"],
    clockEndMarginMs: 10 * 60 * 1000
  },

  audioCues: [
    {
      id: "pre-eclipse",
      refPhase: "C1",
      offsetSec: -300,
      catchupSec: 240,
      textPt: "Atenção. O eclipse começa daqui a cinco minutos. Põe os óculos de eclipse já agora.",
      textEn: "Heads up. The eclipse starts in five minutes. Put your eclipse glasses on now."
    },
    {
      id: "c1",
      refPhase: "C1",
      offsetSec: 0,
      catchupSec: 120,
      textPt: "Início do parcial. A Lua começou a tapar o Sol. Mantém os óculos.",
      textEn: "Partial phase begins. The Moon is now covering the Sun. Keep your glasses on."
    },
    {
      id: "midway",
      refPhase: "C2",
      offsetSec: -1800,
      catchupSec: 600,
      textPt: "Meia hora para a totalidade. Posiciona-te. Liga a câmara. Verifica o horizonte oeste.",
      textEn: "Thirty minutes to totality. Get into position. Set up your camera. Check the west horizon."
    },
    {
      id: "c2-pre60",
      refPhase: "C2",
      offsetSec: -60,
      catchupSec: 30,
      textPt: "Sessenta segundos para a totalidade. Mantém os óculos. Atenção aos grãos de Baily.",
      textEn: "Sixty seconds to totality. Keep glasses on. Watch for Baily's beads."
    },
    {
      id: "c2-pre10",
      refPhase: "C2",
      offsetSec: -10,
      catchupSec: 15,
      textPt: "Dez segundos. Diamond ring iminente. Ainda não tires os óculos.",
      textEn: "Ten seconds. Diamond ring imminent. Don't remove glasses yet."
    },
    {
      id: "c2",
      refPhase: "C2",
      offsetSec: 0,
      catchupSec: 60,
      textPt: "Início aproximado da totalidade. Tira os óculos APENAS se o Sol estiver totalmente coberto.",
      textEn: "Approximate start of totality. Remove glasses ONLY if the Sun is fully covered."
    },
    {
      id: "c2-confirm",
      refPhase: "C2",
      offsetSec: 6,
      catchupSec: 30,
      textPt: "Se já vês a coroa solar, podes olhar diretamente. Coroa solar.",
      textEn: "If you can see the solar corona, you can look directly. Solar corona."
    },
    {
      id: "max",
      refPhase: "Max",
      offsetSec: 0,
      catchupSec: 30,
      textPt: "Máximo. Olha à volta. Crepúsculo trezentos e sessenta graus. Procura Vénus e Mercúrio.",
      textEn: "Maximum. Look around. Three sixty degree twilight. Find Venus and Mercury."
    },
    {
      id: "c3-pre30",
      refPhase: "C3",
      offsetSec: -30,
      catchupSec: 20,
      textPt: "Trinta segundos para o fim da totalidade. Prepara os óculos.",
      textEn: "Thirty seconds to end of totality. Get glasses ready."
    },
    {
      id: "c3-pre10",
      refPhase: "C3",
      offsetSec: -10,
      catchupSec: 8,
      textPt: "Dez segundos. Mãos nos óculos.",
      textEn: "Ten seconds. Hands on glasses."
    },
    {
      id: "c3",
      refPhase: "C3",
      offsetSec: 0,
      catchupSec: 120,
      textPt: "Fim da totalidade. ÓCULOS NOS OLHOS AGORA. O Sol está a reaparecer.",
      textEn: "End of totality. GLASSES ON NOW. The Sun is returning.",
      staleTextPt: "Lembrete de segurança. Se ainda não puseste os óculos, põe imediatamente.",
      staleTextEn: "Safety reminder. If you haven't put your glasses on, do it now."
    },
    {
      id: "sunset",
      refPhase: "Pôr",
      offsetSec: 0,
      catchupSec: 600,
      textPt: "Pôr do Sol em {base}. A observação termina. Espera vinte minutos antes de sair, para evitar trânsito.",
      textEn: "Sunset in {base}. Observation ends. Wait twenty minutes before leaving to avoid traffic."
    }
  ],

  // ---------- Checklist ----------
  checklist: [
    { id: "glasses",   label: "Óculos de eclipse certificados (ISO 12312-2)" },
    { id: "water",     label: "Água e snacks" },
    { id: "seating",   label: "Tapete / cadeiras" },
    { id: "powerbank", label: "Powerbank carregado" },
    { id: "jacket",    label: "Casacos leves (arrefece à noite)" },
    { id: "binos",     label: "Binóculos — APENAS com filtro solar adequado (nunca sem)" },
    { id: "sun",       label: "Protetor solar e chapéu" }
  ],

  // ---------- "O que esperar" ----------
  expectations: [
    {
      title: "Diamond ring (anel de diamante)",
      detail: "Segundos antes e depois da totalidade, um único ponto brilhante de luz solar atravessa o limbo lunar, criando um efeito de anel com diamante. Dura apenas 1–2 segundos de cada lado."
    },
    {
      title: "Grãos de Baily",
      detail: "Pontos de luz que atravessam os vales lunares mesmo antes e depois da totalidade. Olhar a olho nu APENAS no segundo exato em que aparecem, e voltar a pôr óculos."
    },
    {
      title: "Coroa solar",
      detail: "A atmosfera exterior do Sol — um halo branco-prateado em redor da Lua negra. Só é visível durante a totalidade. É o motivo principal de viajar para ver uma totalidade."
    },
    {
      title: "Bandas de sombra",
      detail: "Linhas finas claras/escuras a correr pelo chão e em paredes brancas, ~1 minuto antes e depois da totalidade. Olhar para o chão, não para o Sol. Fenómeno subtil — levar uma cartolina branca ajuda."
    },
    {
      title: "Queda de temperatura",
      detail: "Pode descer 3–6 °C nos minutos antes da totalidade. Os miúdos vão sentir. Casaco leve à mão é mesmo necessário."
    },
    {
      title: "Crepúsculo 360°",
      detail: "Durante a totalidade, o horizonte fica laranja/avermelhado em todas as direções, como um pôr-do-Sol circular. Olhar à volta — não só para o Sol."
    },
    {
      title: "Planetas e estrelas visíveis",
      detail: "Vénus aparece à esquerda do Sol, Mercúrio mais perto e à direita. Em céus muito limpos, podem aparecer estrelas brilhantes. Para esta totalidade, o Sol está muito baixo — o efeito é dramático."
    },
    {
      title: "Reação dos animais",
      detail: "Pássaros podem ir para os ninhos, grilos começam a cantar, o gado pára. Se houver animais por perto, é bonito notar."
    }
  ],

  // ---------- Notas importantes ----------
  notes: [
    "Precisas de horizonte W/NW desimpedido — o Sol estará baixo no horizonte.",
    "Chegar cedo por causa do trânsito e estacionamento.",
    "Totalidade só dentro da faixa central; fora dela é eclipse parcial.",
    "Nunca olhar para o Sol sem proteção adequada — exceto durante os poucos minutos de totalidade.",
    "Confirmar previsão meteorológica nas horas antes; ter sempre um Spot Backup."
  ],

  // ---------- Plano do dia (genérico) ----------
  // {base} é substituído pela cidade-base do plano activo.
  timeline: [
    {
      time: "16:00 – 17:00",
      title: "Decisão com base no tempo",
      detail: "Última verificação de previsão (cloud check). Escolher Spot Principal vs Backup. Confirmar com o grupo."
    },
    {
      time: "17:30 – 18:30",
      title: "Saída / viagem",
      detail: "Sair de {base} para o spot escolhido. Margem para trânsito, paragens e estacionamento."
    },
    {
      time: "19:30",
      title: "Chegar e montar",
      detail: "Instalar tapete/cadeiras, identificar horizonte W/NW, preparar óculos de eclipse, ajustar binóculos com filtro adequado."
    },
    {
      time: "20:27 – 20:33",
      title: "Janela de totalidade (aprox.)",
      detail: "Totalidade dura poucos minutos. Durante a totalidade pode-se olhar sem filtros — fora dela, NUNCA olhar para o Sol sem proteção adequada."
    },
    {
      time: "20:30 – 21:00",
      title: "Ficar mais 20–30 min",
      detail: "Evitar a saída em massa logo após a totalidade. Aproveitar para hidratar, arrumar com calma e deixar o trânsito escoar."
    }
  ],

  // ---------- Meteorologia (Open-Meteo) ----------
  meteo: {
    endpoint: "https://api.open-meteo.com/v1/forecast",
    forecastHorizonDays: 16,
    eclipseDateLocal: "2026-08-12",
    eclipseHourLocal: 20,
    timezone: "Europe/Madrid",
    hourlyVars: [
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "temperature_2m",
      "wind_speed_10m",
      "precipitation_probability",
      "visibility"
    ]
  },

  // ---------- Histórico Meteorológico (Open-Meteo Archive) ----------
  // Para cada spot, descarrega o histórico do mesmo dia (12 Agosto) à mesma
  // hora (20:00 local) nos últimos 10 anos. Permite avaliar a probabilidade
  // climatológica de céu limpo. Cada (spot, ano) é uma chamada à API.
  historyMeteo: {
    endpoint: "https://archive-api.open-meteo.com/v1/archive",
    yearsBack: 10,            // últimos 10 anos antes do eclipse
    eclipseYear: 2026,
    monthDay: "08-12",
    hourLocal: 20,
    timezone: "Europe/Madrid",
    hourlyVars: [
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "temperature_2m",
      "wind_speed_10m",
      "precipitation"
    ],
    // Thresholds (% nuvens) para classificar cada ano.
    thresholds: {
      clear:    30,           // < 30% = excelente (verde)
      marginal: 60            // 30..60% = marginal (amarelo). >60% = mau (vermelho)
    }
  },

  // ===================================================================
  // PLANOS (Plan A — León / Plan B — Caxado)
  // ===================================================================

  plans: {

    // -------------------------------------------------------------
    // Plan A — León (Castilla y León, interior)
    // -------------------------------------------------------------
    leon: {
      id: "leon",
      namePt: "Plano A — León (Castilla)",
      nameEn: "Plan A — León (Castile)",
      base: {
        city: "León",
        coords: [42.5987, -5.5671],
        regionPt: "Castilla y León",
        regionEn: "Castile and León"
      },

      // Hora UTC do meio da totalidade na região de León (aprox.).
      eclipse: {
        totalityMidUTC:   "2026-08-12T18:30:00Z",
        totalityStartUTC: "2026-08-12T18:29:00Z",
        totalityEndUTC:   "2026-08-12T18:31:30Z",
        sunsetLocal: "21:21",
        notePt: "Horas aproximadas para a região de León. Variações entre spots de segundos a ~1 min.",
        noteEn: "Approximate times for the León region. Inter-spot variations of seconds to ~1 min."
      },

      // Fases. tUTC é o timestamp ISO exato para os cues de áudio.
      // C4 = null porque ocorre depois do pôr-do-sol em León.
      phases: [
        { code: "C1",  time: "≈ 19:30", tUTC: "2026-08-12T17:30:00Z",
          title: "Início do parcial",
          detail: "Primeiro contacto — a Lua começa a tapar o Sol. Sol ainda relativamente alto. Óculos de eclipse já postos." },
        { code: "C2",  time: "≈ 20:29", tUTC: "2026-08-12T18:29:00Z",
          title: "Início da totalidade",
          detail: "Segundos antes: grãos de Baily e diamond ring. A Lua cobre totalmente o Sol. Só agora se podem tirar os óculos." },
        { code: "Max", time: "≈ 20:30", tUTC: "2026-08-12T18:30:00Z",
          title: "Máximo / meio da totalidade",
          detail: "Coroa solar visível, céu escurece para crepúsculo 360°. Vénus e Mercúrio podem aparecer junto ao Sol." },
        { code: "C3",  time: "≈ 20:31", tUTC: "2026-08-12T18:31:00Z",
          title: "Fim da totalidade",
          detail: "Diamond ring no lado oposto. Voltar a colocar os óculos IMEDIATAMENTE — o Sol reaparece em segundos." },
        { code: "Pôr", time: "≈ 21:21", tUTC: "2026-08-12T19:21:00Z",
          title: "Pôr-do-Sol em León",
          detail: "O Sol põe-se ainda parcialmente eclipsado, muito perto do horizonte W. Observação termina aqui." },
        { code: "C4",  time: "— (após o pôr-do-Sol)", tUTC: null,
          title: "Fim teórico do parcial",
          detail: "O quarto contacto ocorre quando o Sol já não está visível em León. Sem interesse prático." }
      ],

      // Spots (IDs prefixados com plano para garantir unicidade global).
      // phaseOffsets em segundos relativos a phases[].tUTC acima.
      spots: [
        {
          id: "leon-candamia",
          name: "La Candamia / Puente Castro",
          type: "plano",
          distance: "near",
          distanceLabel: "Próximo (10–15 min de León)",
          coords: [42.5708, -5.5547],
          why: "Campos abertos a sul de León com horizonte oeste relativamente desimpedido. Acesso fácil, perto da cidade, boa logística para chegar cedo e sair depressa.",
          alerts: [
            "Confirmar horizonte W/NW livre antes da totalidade",
            "Estacionamento pode encher — chegar cedo"
          ],
          howToFind: "La Candamia León",
          tags: ["seguro", "logistica"],
          facility: 5,
          experience: 3,
          sun: { altitude: 7.4, azimuth: 283 },
          totalityDurationSec: 90,
          totalityLabel: "≈ 1m 30s",
          phaseOffsets: { C1: 0, C2: 15, Max: 0, C3: -15, "Pôr": 0 }
        },
        {
          id: "leon-portillo",
          name: "Alto del Portillo / Valdefresno",
          type: "elevado",
          distance: "medium",
          distanceLabel: "Médio (30–45 min de León)",
          coords: [42.5300, -5.5300],
          why: "Colinas ligeiramente elevadas a sul de León. Vista mais ampla, menos obstáculos urbanos, bom compromisso entre proximidade e horizonte limpo.",
          alerts: [
            "Estradas secundárias — atenção ao trânsito de regresso",
            "Pouca sombra: levar chapéu / protetor solar para a espera"
          ],
          howToFind: "Alto del Portillo Valdefresno León",
          tags: ["seguro", "fotogenico"],
          facility: 4,
          experience: 4,
          sun: { altitude: 7.4, azimuth: 283 },
          totalityDurationSec: 85,
          totalityLabel: "≈ 1m 25s",
          phaseOffsets: { C1: 0, C2: 18, Max: 0, C3: -17, "Pôr": 0 }
        },
        {
          id: "leon-paramo",
          name: "Páramo Leonés",
          type: "plano",
          distance: "medium",
          distanceLabel: "Médio (30–45 min de León, S/SW)",
          coords: [42.3622, -5.7592],
          why: "Planícies amplas com horizonte 360° muito limpo. Ideal se houver risco de nuvens isoladas — fácil deslocar-se em estradas paralelas para um buraco no céu.",
          alerts: [
            "Pouca sombra e pouca infraestrutura — preparar abastecimento",
            "Considerar mobilidade: ter plano B para mudar de sítio rapidamente"
          ],
          howToFind: "Santa María del Páramo Valencia de Don Juan",
          tags: ["seguro", "logistica"],
          facility: 3,
          experience: 4,
          sun: { altitude: 7.5, azimuth: 283 },
          totalityDurationSec: 70,
          totalityLabel: "≈ 1m 10s",
          phaseOffsets: { C1: -10, C2: 15, Max: -10, C3: -35, "Pôr": 20 }
        },
        {
          id: "leon-babia",
          name: "Babia / San Emiliano",
          type: "montanha",
          distance: "long",
          distanceLabel: "Longo (1h–1h20 de León)",
          coords: [42.9508, -6.0072],
          why: "Plateau de montanha com cenário dramático e mais próximo da linha central — totalidade mais longa. Opção 'wow' para fotografia paisagística.",
          alerts: [
            "Tempo em montanha pode mudar depressa — risco de nuvens",
            "Estrada de regresso à noite pode ser longa",
            "Confirmar horizonte W/NW sem montanhas a tapar"
          ],
          howToFind: "San Emiliano Babia León",
          tags: ["fotogenico", "wow"],
          facility: 2,
          experience: 5,
          sun: { altitude: 7.8, azimuth: 283 },
          totalityDurationSec: 100,
          totalityLabel: "≈ 1m 40s",
          phaseOffsets: { C1: -35, C2: -25, Max: -35, C3: -45, "Pôr": 170 }
        }
      ],

      hotels: [
        { name: "Barceló León Conde Luna",
          notes: ["Central", "Fácil acesso de carro", "Bom para família", "Boa saída para sul"] },
        { name: "NH Collection León Plaza Mayor",
          notes: ["Central", "Junto ao centro histórico", "Bom para família"] },
        { name: "Silken Luis de León",
          notes: ["Boa saída para sul", "Estacionamento útil", "Tranquilo"] },
        { name: "AC Hotel León San Antonio",
          notes: ["Fácil acesso de carro", "Boa ligação a vias rápidas", "Bom para família"] }
      ],

      // weather -> id do spot recomendado + razão
      decisionMatrix: {
        clear:    { spotId: "leon-candamia", reason: "Céu limpo — não precisa de altitude extra. La Candamia oferece proximidade e logística simples." },
        haze:     { spotId: "leon-portillo", reason: "Com haze/horizonte sujo, ganhar altitude ajuda. Alto del Portillo dá vista mais limpa." },
        clouds:   { spotId: "leon-paramo",   reason: "Risco de nuvens isoladas — planícies do Páramo permitem ajustar a posição rapidamente." },
        mountain: { spotId: "leon-babia",    reason: "Atmosfera estável e foco em fotografia — Babia oferece o cenário mais cinematográfico." }
      },

      weatherOptions: [
        { value: "clear",    label: "Céu limpo" },
        { value: "haze",     label: "Algum haze / horizonte sujo" },
        { value: "clouds",   label: "Risco de nuvens isoladas" },
        { value: "mountain", label: "Estável e quer foco em fotos" }
      ]
    },

    // -------------------------------------------------------------
    // Plan B — Caxado (Galicia, costa atlântica)
    // -------------------------------------------------------------
    caxado: {
      id: "caxado",
      namePt: "Plano B — Caxado (Galiza)",
      nameEn: "Plan B — Caxado (Galicia)",
      base: {
        city: "Ferrol",
        coords: [43.4831, -8.2333],
        regionPt: "Galiza",
        regionEn: "Galicia"
      },

      // Galiza está ~270 km NW de León. A umbra desloca-se de NW→SE em
      // Espanha, por isso a totalidade ocorre ~90s mais cedo. O pôr-do-sol
      // local é ~14 min mais tarde (Δlon ≈ 2°W + lat ligeiramente mais alta).
      eclipse: {
        totalityMidUTC:   "2026-08-12T18:28:30Z",
        totalityStartUTC: "2026-08-12T18:27:35Z",
        totalityEndUTC:   "2026-08-12T18:29:25Z",
        sunsetLocal: "21:35",
        notePt: "Horas aproximadas para o NW da Galiza (As Pontes/Caxado). Spots costeiros vêem a totalidade ainda mais cedo.",
        noteEn: "Approximate times for NW Galicia (As Pontes/Caxado). Coastal spots see totality slightly earlier."
      },

      // Phases. A referência do plano corresponde ao spot Mirador Monte Caxado
      // (totalidade 110s centrada em 18:28:30 UTC).
      phases: [
        { code: "C1",  time: "≈ 19:28", tUTC: "2026-08-12T17:28:00Z",
          title: "Início do parcial",
          detail: "Primeiro contacto — a Lua começa a tapar o Sol. Ainda há ~1h de eclipse parcial antes da totalidade." },
        { code: "C2",  time: "≈ 20:27", tUTC: "2026-08-12T18:27:35Z",
          title: "Início da totalidade",
          detail: "A Lua cobre totalmente o Sol. Só agora se podem tirar os óculos. Galiza está perto da entrada da umbra em Espanha." },
        { code: "Max", time: "≈ 20:28", tUTC: "2026-08-12T18:28:30Z",
          title: "Máximo / meio da totalidade",
          detail: "Coroa solar visível, céu escurece para crepúsculo 360°. Vénus e Mercúrio podem aparecer junto ao Sol." },
        { code: "C3",  time: "≈ 20:29", tUTC: "2026-08-12T18:29:25Z",
          title: "Fim da totalidade",
          detail: "Diamond ring no lado oposto. Voltar a colocar os óculos IMEDIATAMENTE — o Sol reaparece em segundos." },
        { code: "Pôr", time: "≈ 21:35", tUTC: "2026-08-12T19:35:00Z",
          title: "Pôr-do-Sol na Galiza",
          detail: "O Sol põe-se ainda parcialmente eclipsado, muito perto do horizonte W. Observação termina aqui." },
        { code: "C4",  time: "— (após o pôr-do-Sol)", tUTC: null,
          title: "Fim teórico do parcial",
          detail: "O quarto contacto ocorre quando o Sol já não está visível. Sem interesse prático." }
      ],

      spots: [
        {
          id: "caxado-monte",
          name: "Mirador Monte Caxado",
          type: "montanha",
          distance: "near",
          distanceLabel: "Próximo (35 min de Ferrol)",
          coords: [43.4744, -7.7311],
          why: "Mirador panorâmico a ~1037 m no NW da Galiza (As Pontes / Vilalba). Perto da linha central na entrada da umbra em Espanha — totalidade ligeiramente mais longa. Ângulo elevado dá vista limpa do horizonte oeste.",
          alerts: [
            "Acesso por estradas de montanha; confirmar estacionamento no mirador",
            "Meteorologia atlântica pode mudar depressa — variável, vento possível",
            "Cobertura Street View pode ser limitada — usar 'Abrir no Google Maps'"
          ],
          howToFind: "Mirador Monte Caxado As Pontes Galicia",
          tags: ["fotogenico", "wow"],
          facility: 3,
          experience: 5,
          sun: { altitude: 7.6, azimuth: 283 },
          totalityDurationSec: 110,
          totalityLabel: "≈ 1m 50s",
          // Referência do plano (offsets a zero).
          phaseOffsets: { C1: 0, C2: 0, Max: 0, C3: 0, "Pôr": 0 }
        },
        {
          id: "caxado-frouxeira",
          name: "Mirador da Frouxeira (Valdoviño)",
          type: "elevado",
          distance: "near",
          distanceLabel: "Próximo (30 min de Ferrol)",
          coords: [43.6094, -8.1639],
          why: "Colina costeira com vista para o Atlântico Norte. Horizonte oeste sobre o oceano — sem obstáculos. Boa opção quando o interior tem haze e a costa está limpa.",
          alerts: [
            "Risco de nuvens marítimas baixas (nevoeiro do Atlântico)",
            "Vento costeiro — segurar bem o equipamento",
            "Confirmar horizonte W sem nuvens junto ao mar"
          ],
          howToFind: "Mirador da Frouxeira Valdoviño",
          tags: ["fotogenico", "seguro"],
          facility: 4,
          experience: 4,
          sun: { altitude: 7.4, azimuth: 283 },
          totalityDurationSec: 100,
          totalityLabel: "≈ 1m 40s",
          // ~50 km NW de Caxado, mais cedo na umbra. Pôr-do-sol +2 min
          // (longitude mais a oeste).
          phaseOffsets: { C1: -20, C2: -15, Max: -20, C3: -25, "Pôr": 120 }
        },
        {
          id: "caxado-sanpedro",
          name: "Monte San Pedro (A Coruña)",
          type: "elevado",
          distance: "medium",
          distanceLabel: "Médio (55 min de Ferrol)",
          coords: [43.3801, -8.4544],
          why: "Parque urbano elevado em A Coruña com vista 360° sobre a cidade e o Atlântico. Acesso por estrada/ascensor panorâmico. Logística muito boa: hotéis e restaurantes a 10 min.",
          alerts: [
            "Mais a oeste — totalidade ligeiramente mais curta (~90s)",
            "Cidade — poluição luminosa irrelevante mas trânsito possível",
            "Estacionamento limitado no parque — chegar cedo"
          ],
          howToFind: "Monte San Pedro A Coruña parque",
          tags: ["logistica", "urbano"],
          facility: 5,
          experience: 3,
          sun: { altitude: 7.2, azimuth: 283 },
          totalityDurationSec: 90,
          totalityLabel: "≈ 1m 30s",
          // A Coruña a SW de Caxado. Max ~15s mais cedo, pôr-do-sol +3 min.
          phaseOffsets: { C1: -15, C2: -5, Max: -15, C3: -25, "Pôr": 200 }
        },
        {
          id: "caxado-ortegal",
          name: "Cabo Ortegal (Cariño)",
          type: "plano",
          distance: "medium",
          distanceLabel: "Médio (1h de Ferrol)",
          coords: [43.7654, -7.8740],
          why: "Falésias dramáticas no extremo norte da Galiza, onde o Cantábrico encontra o Atlântico. Cenário 'fim do mundo' — opção mais fotogénica do plano. Sol no horizonte sobre o mar.",
          alerts: [
            "Vento forte e exposição — agasalhos obrigatórios",
            "Nevoeiro marítimo possível mesmo no Verão",
            "Estradas de montanha até ao cabo — última parte estreita",
            "Sem qualquer infraestrutura — levar tudo"
          ],
          howToFind: "Cabo Ortegal Cariño A Coruña",
          tags: ["fotogenico", "wow"],
          facility: 1,
          experience: 5,
          sun: { altitude: 7.4, azimuth: 283 },
          totalityDurationSec: 90,
          totalityLabel: "≈ 1m 30s",
          // N de Caxado, mais cedo na umbra. Pôr-do-sol +30s.
          phaseOffsets: { C1: -30, C2: -20, Max: -30, C3: -40, "Pôr": 30 }
        }
      ],

      hotels: [
        { name: "Parador de Ferrol",
          notes: ["Central (Ferrol)", "Histórico", "Vista para a ria", "Bom para família"] },
        { name: "Hotel Almirante (Ferrol)",
          notes: ["Centro de Ferrol", "Estacionamento", "Boa relação qualidade/preço"] },
        { name: "Hesperia Finisterre (A Coruña)",
          notes: ["Frente ao mar (A Coruña)", "~45 min de Ferrol", "Familiar"] },
        { name: "Meliá María Pita (A Coruña)",
          notes: ["Praia de Riazor (A Coruña)", "Central", "Bom para família"] }
      ],

      decisionMatrix: {
        clear:    { spotId: "caxado-monte",      reason: "Céu limpo — aproveitar o mirador panorâmico a 1037 m com totalidade mais longa do plano." },
        haze:     { spotId: "caxado-frouxeira",  reason: "Haze no interior — a costa pode estar limpa. Frouxeira oferece elevação com horizonte marítimo." },
        clouds:   { spotId: "caxado-sanpedro",   reason: "Risco de nuvens — Monte San Pedro está na cidade, dá mobilidade rápida para mudar de spot dentro de A Coruña." },
        mountain: { spotId: "caxado-ortegal",    reason: "Atmosfera estável e foco em fotos — Cabo Ortegal oferece o cenário mais dramático (falésias sobre o Atlântico)." }
      },

      weatherOptions: [
        { value: "clear",    label: "Céu limpo" },
        { value: "haze",     label: "Algum haze / horizonte sujo" },
        { value: "clouds",   label: "Risco de nuvens isoladas" },
        { value: "mountain", label: "Estável e quer foco em fotos" }
      ]
    }

  },

  // ===================================================================
  // i18n (PT por defeito, EN parcial)
  // ===================================================================
  i18n: {
    pt: {
      appTitle: "Eclipse Solar Total — Espanha 2026",
      appSubtitle: "12 de Agosto de 2026 · Plano de observação para a família",
      planLabel: "Plano",
      myBase: "Base",
      primarySpot: "Spot Principal",
      backupSpot: "Spot Backup",
      notSet: "(por definir)",
      // {city} é substituído pela cidade-base do plano activo.
      sectionSpotsTpl: "Spots de Observação (perto de {city})",
      sectionHotelsTpl: "Hotéis em {city} (base recomendada)",
      sectionPlan: "Plano do Dia",
      sectionChecklist: "Checklist",
      sectionNotes: "Notas Importantes",
      sectionDecision: "Matriz de Decisão",
      sectionPhases: "Fases do Eclipse",
      sectionExpectations: "O que Esperar",
      sectionAudio: "Cues de Áudio (Dia do Eclipse)",
      audioIntro: "Avisos por voz que tocam no momento exato de cada fase. Útil quando estás a olhar para o Sol e não para o ecrã. São auxiliares — não substituem os óculos ISO nem o teu próprio julgamento.",
      audioActivate: "Ativar cues de áudio",
      audioDeactivate: "Desativar",
      audioTest: "Testar voz",
      audioPreview: "Pré-visualizar todos",
      audioStop: "Parar",
      audioStatusInactive: "Inativo — clica em Ativar para começar",
      audioStatusActive: "Ativo — vai falar no momento de cada fase",
      audioStatusUnsupported: "Voz não suportada neste browser",
      audioStatusPreview: "A pré-visualizar…",
      audioStatusDone: "Eclipse concluído",
      audioWakeLock: "Manter ecrã ligado (precisa de HTTPS)",
      audioWakeLockUnsupported: "Wake Lock não suportado neste contexto (usa HTTPS).",
      audioGestureNotice: "Por exigência dos browsers, tens de ativar uma vez por sessão. Se fechares o separador, é preciso re-ativar.",
      audioNextCue: "Próximo cue",
      audioNoMoreCues: "Sem mais cues programados.",
      audioCuesPlanned: "Ver todos os cues planeados",
      audioMobileWarning: "No telemóvel: mantém o browser aberto e o ecrã ligado para garantir que os cues tocam. iPhone tem mais limitações que Android.",
      audioPlanSwitched: "Plano mudou — áudio desativado por segurança. Re-activa se queres ouvir os cues do novo plano.",
      countdownLabel: "Até à totalidade",
      countdownActive: "TOTALIDADE EM CURSO",
      countdownDone: "Eclipse concluído",
      days: "d",
      hours: "h",
      minutes: "m",
      seconds: "s",
      sunAtTotality: "Posição do Sol",
      altitude: "Altitude",
      azimuth: "Azimute",
      totalityDuration: "Totalidade",
      approxDisclaimer: "Valores aproximados — confirmar com fontes oficiais perto da data.",
      timingsAdjusted: "Timings ajustados para",
      timingsGenericTpl: "Timings: média regional ({region}) — define um Spot Principal para ajustar",
      streetviewTitle: "Vista do Spot Principal",
      streetviewHint: "Câmara apontada na direção do Sol durante a totalidade. Em zonas rurais a vista pode cair na estrada mais próxima.",
      streetviewOpenMaps: "Abrir no Google Maps",
      streetviewOpenSv: "Abrir Street View",
      streetviewNoCoverage: "Sem cobertura Street View neste ponto exacto. Tenta abrir no Google Maps e arrastar o ícone até à estrada mais próxima.",
      sectionWeather: "Meteorologia (Open-Meteo)",
      sectionHistory: "Histórico Meteorológico (10 anos)",
      historyIntro: "Como esteve o céu no mesmo dia (12 Agosto), à mesma hora (≈ 20:00) nos últimos 10 anos. Não é previsão — é climatologia. Ajuda a perceber se cada spot é geralmente confiável.",
      loadHistory: "Carregar histórico",
      historyLoading: "A carregar histórico…",
      historyDisclaimer: "Demora alguns segundos (até 80 pedidos à API de arquivo). Os dados ficam guardados no browser.",
      historyEmpty: "Sem dados ainda. Clica em \u201CCarregar hist\u00F3rico\u201D.",
      historySuccessRate: "anos com céu limpo",
      historySuccessRateOf: "de",
      historyAvgCloud: "Média de nuvens",
      historyError: "Falha ao obter histórico para este spot.",
      historyClearYears: "céu limpo",
      historyMarginalYears: "marginal",
      historyCloudyYears: "muito nublado",
      historyHourLabel: "às 20:00 (CEST)",
      refreshForecast: "Atualizar previsão",
      lastUpdated: "Última atualização",
      never: "nunca",
      weatherLoading: "A obter previsão…",
      weatherOutOfRange: "Previsão completa disponível só nos 16 dias antes do eclipse.",
      weatherDaysAway: "Faltam {n} dias para o eclipse.",
      weatherTryAgain: "Tenta de novo perto da data.",
      weatherError: "Falha ao obter previsão. Verifica a ligação à internet.",
      weatherSuggestion: "Sugestão automática",
      applySuggestion: "Aplicar à matriz",
      forecastFor: "Previsão para",
      cloudTotal: "Nuvens (total)",
      cloudLow: "Nuvens baixas",
      cloudMid: "Nuvens médias",
      cloudHigh: "Nuvens altas",
      temperature: "Temperatura",
      wind: "Vento",
      precipitation: "Prob. precipitação",
      visibility: "Visibilidade",
      statusExcellent: "Excelente",
      statusGood: "Bom",
      statusMarginal: "Marginal",
      statusPoor: "Mau",
      filters: "Filtros",
      filterDistance: "Distância",
      filterType: "Tipo",
      filterPriority: "Prioridade",
      sortBy: "Ordenar por",
      sortFacility: "Facilidade / Logística",
      sortExperience: "Experiência",
      all: "Todos",
      near: "Próximo",
      medium: "Médio",
      long: "Longo",
      typeFlat: "Plano",
      typeHigh: "Elevado",
      typeMountain: "Montanha",
      safer: "Mais Seguro",
      photogenic: "Mais Fotogénico",
      whyGood: "Porquê é bom",
      alerts: "Alertas",
      howToFind: "Como encontrar",
      copySearch: "Copiar pesquisa",
      setPrimary: "Definir como Spot Principal",
      setBackup: "Definir como Spot Backup",
      copyHotel: "Copiar nome do hotel",
      hotelDisclaimer: "Confirmar disponibilidade e estacionamento no momento da reserva.",
      weather: "Condição do tempo",
      recommended: "Recomendado",
      resetChecklist: "Reset checklist",
      printPdf: "Imprimir / Guardar PDF",
      copied: "Copiado!",
      languageLabel: "Idioma",
      mapFallback: "Mapa indisponível — usa a lista de spots abaixo.",
      footer: "Dados editáveis em data.js. App estática — funciona offline depois de carregada."
    },
    en: {
      appTitle: "Total Solar Eclipse — Spain 2026",
      appSubtitle: "August 12, 2026 · Family viewing plan",
      planLabel: "Plan",
      myBase: "Base",
      primarySpot: "Primary Spot",
      backupSpot: "Backup Spot",
      notSet: "(not set)",
      sectionSpotsTpl: "Viewing Spots (near {city})",
      sectionHotelsTpl: "Hotels in {city} (recommended base)",
      sectionPlan: "Day Plan",
      sectionChecklist: "Checklist",
      sectionNotes: "Important Notes",
      sectionDecision: "Decision Matrix",
      sectionPhases: "Eclipse Phases",
      sectionExpectations: "What to Expect",
      sectionAudio: "Audio Cues (Eclipse Day)",
      audioIntro: "Voice alerts that play at the exact moment of each phase. Useful when you're looking at the Sun and not the screen. They're auxiliary — not a substitute for ISO glasses or your own judgement.",
      audioActivate: "Activate audio cues",
      audioDeactivate: "Deactivate",
      audioTest: "Test voice",
      audioPreview: "Preview all",
      audioStop: "Stop",
      audioStatusInactive: "Inactive — click Activate to start",
      audioStatusActive: "Active — will speak at each phase",
      audioStatusUnsupported: "Speech not supported in this browser",
      audioStatusPreview: "Previewing…",
      audioStatusDone: "Eclipse finished",
      audioWakeLock: "Keep screen on (requires HTTPS)",
      audioWakeLockUnsupported: "Wake Lock not supported in this context (use HTTPS).",
      audioGestureNotice: "Browsers require activation once per session. If you close the tab, you'll need to re-activate.",
      audioNextCue: "Next cue",
      audioNoMoreCues: "No more cues scheduled.",
      audioCuesPlanned: "Show all planned cues",
      audioMobileWarning: "On mobile: keep browser open and screen on so cues play reliably. iPhone has more limitations than Android.",
      audioPlanSwitched: "Plan changed — audio disabled for safety. Re-activate to hear the new plan's cues.",
      countdownLabel: "Until totality",
      countdownActive: "TOTALITY IN PROGRESS",
      countdownDone: "Eclipse finished",
      days: "d",
      hours: "h",
      minutes: "m",
      seconds: "s",
      sunAtTotality: "Sun position",
      altitude: "Altitude",
      azimuth: "Azimuth",
      totalityDuration: "Totality",
      approxDisclaimer: "Approximate values — verify with official sources near the date.",
      timingsAdjusted: "Timings adjusted for",
      timingsGenericTpl: "Timings: regional average ({region}) — set a Primary Spot to adjust",
      streetviewTitle: "View of the Primary Spot",
      streetviewHint: "Camera oriented toward the Sun during totality. In rural areas the view may snap to the nearest road.",
      streetviewOpenMaps: "Open in Google Maps",
      streetviewOpenSv: "Open Street View",
      streetviewNoCoverage: "No Street View coverage at this exact point. Try opening in Google Maps and dragging the pegman to the nearest road.",
      sectionWeather: "Weather (Open-Meteo)",
      sectionHistory: "Weather Climatology (last 10 years)",
      historyIntro: "How the sky looked on the same day (Aug 12), at the same hour (≈ 20:00 local), over the last 10 years. Not a forecast — climatology. Helps you see which spots are historically reliable.",
      loadHistory: "Load history",
      historyLoading: "Loading history…",
      historyDisclaimer: "Takes a few seconds (up to 80 archive-API calls). Data is stored in your browser.",
      historyEmpty: "No data yet. Click \u201CLoad history\u201D.",
      historySuccessRate: "years with clear sky",
      historySuccessRateOf: "of",
      historyAvgCloud: "Average clouds",
      historyError: "Failed to fetch history for this spot.",
      historyClearYears: "clear",
      historyMarginalYears: "marginal",
      historyCloudyYears: "cloudy",
      historyHourLabel: "at 20:00 (CEST)",
      refreshForecast: "Refresh forecast",
      lastUpdated: "Last updated",
      never: "never",
      weatherLoading: "Fetching forecast…",
      weatherOutOfRange: "Full forecast only available within 16 days of the eclipse.",
      weatherDaysAway: "{n} days until the eclipse.",
      weatherTryAgain: "Try again closer to the date.",
      weatherError: "Failed to fetch forecast. Check your internet connection.",
      weatherSuggestion: "Auto suggestion",
      applySuggestion: "Apply to matrix",
      forecastFor: "Forecast for",
      cloudTotal: "Cloud cover (total)",
      cloudLow: "Low clouds",
      cloudMid: "Mid clouds",
      cloudHigh: "High clouds",
      temperature: "Temperature",
      wind: "Wind",
      precipitation: "Precip. probability",
      visibility: "Visibility",
      statusExcellent: "Excellent",
      statusGood: "Good",
      statusMarginal: "Marginal",
      statusPoor: "Poor",
      filters: "Filters",
      filterDistance: "Distance",
      filterType: "Type",
      filterPriority: "Priority",
      sortBy: "Sort by",
      sortFacility: "Ease / Logistics",
      sortExperience: "Experience",
      all: "All",
      near: "Near",
      medium: "Medium",
      long: "Long",
      typeFlat: "Flat",
      typeHigh: "Elevated",
      typeMountain: "Mountain",
      safer: "Safer",
      photogenic: "More Photogenic",
      whyGood: "Why it's good",
      alerts: "Alerts",
      howToFind: "How to find",
      copySearch: "Copy search",
      setPrimary: "Set as Primary Spot",
      setBackup: "Set as Backup Spot",
      copyHotel: "Copy hotel name",
      hotelDisclaimer: "Confirm availability and parking when booking.",
      weather: "Weather condition",
      recommended: "Recommended",
      resetChecklist: "Reset checklist",
      printPdf: "Print / Save PDF",
      copied: "Copied!",
      languageLabel: "Language",
      mapFallback: "Map unavailable — use the spot list below.",
      footer: "Editable data in data.js. Static app — works offline after first load."
    }
  }
};
