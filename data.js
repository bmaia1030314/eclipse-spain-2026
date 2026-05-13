/*
 * data.js
 *
 * Conteúdo editável da aplicação (spots, hotéis, plano do dia,
 * checklist, matriz de decisão, notas e traduções).
 *
 * Para alterar/acrescentar conteúdo basta editar este ficheiro.
 * Todos os textos principais estão em PT (com fallback EN simples).
 */

window.APP_DATA = {

  // ---------- Momento da totalidade ----------
  // Hora UTC do meio da totalidade na região de León (aprox.).
  // 12/08/2026 ~20:30 CEST = 18:30 UTC.
  eclipse: {
    totalityMidUTC: "2026-08-12T18:30:00Z",
    totalityStartUTC: "2026-08-12T18:29:00Z",
    totalityEndUTC:   "2026-08-12T18:31:30Z",
    sunsetLocal: "21:21",
    note: "Horas aproximadas para a região de León. Pequenas variações (segundos a 1 min) entre spots."
  },

  // ---------- Fases do eclipse (hora local CEST, aproximadas) ----------
  phases: [
    {
      code: "C1",
      time: "≈ 19:30",
      title: "Início do parcial",
      detail: "Primeiro contacto — a Lua começa a tapar o Sol. Sol ainda relativamente alto. Óculos de eclipse já postos."
    },
    {
      code: "C2",
      time: "≈ 20:29",
      title: "Início da totalidade",
      detail: "Segundos antes: grãos de Baily e diamond ring. A Lua cobre totalmente o Sol. Só agora se podem tirar os óculos."
    },
    {
      code: "Max",
      time: "≈ 20:30",
      title: "Máximo / meio da totalidade",
      detail: "Coroa solar visível, céu escurece para crepúsculo 360°. Vénus e Mercúrio podem aparecer junto ao Sol."
    },
    {
      code: "C3",
      time: "≈ 20:31",
      title: "Fim da totalidade",
      detail: "Diamond ring no lado oposto. Voltar a colocar os óculos IMEDIATAMENTE — o Sol reaparece em segundos."
    },
    {
      code: "Pôr",
      time: "≈ 21:21",
      title: "Pôr-do-Sol em León",
      detail: "O Sol põe-se ainda parcialmente eclipsado, muito perto do horizonte W. Observação termina aqui."
    },
    {
      code: "C4",
      time: "— (após o pôr-do-Sol)",
      title: "Fim teórico do parcial",
      detail: "O quarto contacto ocorre quando o Sol já não está visível em León. Sem interesse prático."
    }
  ],

  // ---------- Spots de observação ----------
  // Coordenadas aproximadas (úteis apenas para o mapa, opcional).
  // sun.altitude/azimuth em graus, calculados para 18:30 UTC do dia 12/08/2026.
  // totalityDurationSec é uma estimativa baseada na distância à linha central.
  spots: [
    {
      id: "candamia",
      name: "La Candamia / Puente Castro",
      type: "plano",                 // plano | elevado | montanha
      distance: "near",              // near | medium | long
      distanceLabel: "Próximo (10–15 min de León)",
      coords: [42.5708, -5.5547],
      why: "Campos abertos a sul de León com horizonte oeste relativamente desimpedido. Acesso fácil, perto da cidade, boa logística para chegar cedo e sair depressa.",
      alerts: [
        "Confirmar horizonte W/NW livre antes da totalidade",
        "Estacionamento pode encher — chegar cedo",
      ],
      howToFind: "La Candamia León",
      tags: ["seguro", "logistica"],
      facility: 5,
      experience: 3,
      sun: { altitude: 7.4, azimuth: 283 },
      totalityDurationSec: 90,
      totalityLabel: "≈ 1m 30s"
    },
    {
      id: "portillo",
      name: "Alto del Portillo / Valdefresno",
      type: "elevado",
      distance: "medium",
      distanceLabel: "Médio (30–45 min de León)",
      coords: [42.5300, -5.5300],
      why: "Colinas ligeiramente elevadas a sul de León. Vista mais ampla, menos obstáculos urbanos, bom compromisso entre proximidade e horizonte limpo.",
      alerts: [
        "Estradas secundárias — atenção ao trânsito de regresso",
        "Pouca sombra: levar chapéu / protetor solar para a espera",
      ],
      howToFind: "Alto del Portillo Valdefresno León",
      tags: ["seguro", "fotogenico"],
      facility: 4,
      experience: 4,
      sun: { altitude: 7.4, azimuth: 283 },
      totalityDurationSec: 85,
      totalityLabel: "≈ 1m 25s"
    },
    {
      id: "paramo",
      name: "Páramo Leonés (Santa María del Páramo / Valencia de Don Juan)",
      type: "plano",
      distance: "medium",
      distanceLabel: "Médio (30–45 min de León)",
      coords: [42.3622, -5.7592],
      why: "Planícies amplas com horizonte 360° muito limpo. Ideal se houver risco de nuvens isoladas — fácil deslocar-se em estradas paralelas para um buraco no céu.",
      alerts: [
        "Pouca infraestrutura — levar tudo de casa",
        "Verão pode estar muito quente até ao pôr do Sol",
        "Mais a sul da linha central — totalidade um pouco mais curta",
      ],
      howToFind: "Santa María del Páramo, León",
      tags: ["seguro", "flexivel"],
      facility: 4,
      experience: 4,
      sun: { altitude: 7.5, azimuth: 283 },
      totalityDurationSec: 70,
      totalityLabel: "≈ 1m 10s"
    },
    {
      id: "babia",
      name: "Babia / San Emiliano",
      type: "montanha",
      distance: "long",
      distanceLabel: "Longo (1h–1h20 de León)",
      coords: [42.9508, -6.0072],
      why: "Plateau de montanha com cenário dramático e mais próximo da linha central — totalidade mais longa. Opção 'wow' para fotografia paisagística.",
      alerts: [
        "Tempo em montanha pode mudar depressa — risco de nuvens",
        "Estrada de regresso à noite pode ser longa",
        "Confirmar horizonte W/NW sem montanhas a tapar",
      ],
      howToFind: "San Emiliano Babia León",
      tags: ["fotogenico", "wow"],
      facility: 2,
      experience: 5,
      sun: { altitude: 7.8, azimuth: 283 },
      totalityDurationSec: 100,
      totalityLabel: "≈ 1m 40s"
    }
  ],

  // ---------- Hotéis em León ----------
  hotels: [
    {
      name: "Barceló León Conde Luna",
      notes: ["Central", "Fácil acesso de carro", "Bom para família", "Boa saída para sul"]
    },
    {
      name: "NH Collection León Plaza Mayor",
      notes: ["Central", "Junto ao centro histórico", "Bom para família"]
    },
    {
      name: "Silken Luis de León",
      notes: ["Boa saída para sul", "Estacionamento útil", "Tranquilo"]
    },
    {
      name: "AC Hotel León San Antonio",
      notes: ["Fácil acesso de carro", "Boa ligação a vias rápidas", "Bom para família"]
    }
  ],

  // ---------- Plano do dia (Eclipse Day) ----------
  // Blocos da timeline. Hora apenas indicativa.
  timeline: [
    {
      time: "16:00 – 17:00",
      title: "Decisão com base no tempo",
      detail: "Última verificação de previsão (cloud check). Escolher Spot Principal vs Backup. Confirmar com o grupo."
    },
    {
      time: "17:30 – 18:30",
      title: "Saída / viagem",
      detail: "Sair de León para o spot escolhido. Margem para trânsito, paragens e estacionamento."
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

  // ---------- Matriz de decisão ----------
  // weather -> id do spot recomendado
  decisionMatrix: {
    clear:    { spotId: "candamia", reason: "Céu limpo — não precisa de altitude extra. La Candamia oferece proximidade e logística simples." },
    haze:     { spotId: "portillo", reason: "Com haze/horizonte sujo, ganhar altitude ajuda. Alto del Portillo dá vista mais limpa." },
    clouds:   { spotId: "paramo",   reason: "Risco de nuvens isoladas — planícies do Páramo permitem ajustar a posição rapidamente." },
    mountain: { spotId: "babia",    reason: "Atmosfera estável e foco em fotografia — Babia oferece o cenário mais cinematográfico." }
  },

  weatherOptions: [
    { value: "clear",    label: "Céu limpo" },
    { value: "haze",     label: "Algum haze / horizonte sujo" },
    { value: "clouds",   label: "Risco de nuvens isoladas" },
    { value: "mountain", label: "Estável e quer foco em fotos" }
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

  // ---------- Meteorologia (Open-Meteo) ----------
  // Open-Meteo é gratuito e não precisa de chave. Janela de previsão: 16 dias.
  meteo: {
    endpoint: "https://api.open-meteo.com/v1/forecast",
    forecastHorizonDays: 16,
    eclipseDateLocal: "2026-08-12",
    eclipseHourLocal: 20,                // 20:00 CEST (hora da totalidade)
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

  // ---------- Notas importantes ----------
  notes: [
    "Precisas de horizonte W/NW desimpedido — o Sol estará baixo no horizonte.",
    "Chegar cedo por causa do trânsito e estacionamento.",
    "Totalidade só dentro da faixa central; fora dela é eclipse parcial.",
    "Nunca olhar para o Sol sem proteção adequada — exceto durante os poucos minutos de totalidade.",
    "Confirmar previsão meteorológica nas horas antes; ter sempre um Spot Backup."
  ],

  // ---------- Traduções (PT por defeito, EN parcial) ----------
  i18n: {
    pt: {
      appTitle: "Eclipse Solar Total — León 2026",
      appSubtitle: "12 de Agosto de 2026 · Plano de observação para a família",
      myBase: "Base",
      primarySpot: "Spot Principal",
      backupSpot: "Spot Backup",
      notSet: "(por definir)",
      sectionSpots: "Spots de Observação (perto de León)",
      sectionHotels: "Hotéis em León (base recomendada)",
      sectionPlan: "Plano do Dia",
      sectionChecklist: "Checklist",
      sectionNotes: "Notas Importantes",
      sectionDecision: "Matriz de Decisão",
      sectionPhases: "Fases do Eclipse",
      sectionExpectations: "O que Esperar",
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
      sectionWeather: "Meteorologia (Open-Meteo)",
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
      base: "León",
      footer: "Dados editáveis em data.js. App estática — funciona offline depois de carregada."
    },
    en: {
      appTitle: "Total Solar Eclipse — León 2026",
      appSubtitle: "August 12, 2026 · Family viewing plan",
      myBase: "Base",
      primarySpot: "Primary Spot",
      backupSpot: "Backup Spot",
      notSet: "(not set)",
      sectionSpots: "Viewing Spots (near León)",
      sectionHotels: "Hotels in León (recommended base)",
      sectionPlan: "Day Plan",
      sectionChecklist: "Checklist",
      sectionNotes: "Important Notes",
      sectionDecision: "Decision Matrix",
      sectionPhases: "Eclipse Phases",
      sectionExpectations: "What to Expect",
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
      sectionWeather: "Weather (Open-Meteo)",
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
      base: "León",
      footer: "Editable data in data.js. Static app — works offline after first load."
    }
  }
};
