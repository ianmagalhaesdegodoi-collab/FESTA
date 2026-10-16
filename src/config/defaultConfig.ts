import { EventConfig } from '../types';

export const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: 'NEON VELVET CLUB NIGHT',
  eventSubtitle: 'A Maior Noite Eletrônica de Goiânia com Sets Exclusivos e Open Bar Premium',
  eventDate: '2026-11-21',
  eventTime: '22:00',
  venueName: 'Espaço 82 Eventos',
  venueAddress: 'Rua 82, Setor Sul',
  venueCity: 'Goiânia - GO',
  venueMapUrl: 'https://maps.google.com/?q=Espaco+82+Eventos+Goiania',
  venueEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3821.579469733446!2d-49.2558509!3d-16.6828551!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935ef1b3f9bb8cbb%3A0xb35a075304677761!2sSetor%20Sul%2C%20Goi%C3%A2nia%20-%20GO!5e0!3m2!1spt-BR!2sbr!4v1710000000000',
  minAge: 18,
  totalCapacity: 320,
  salesEnabled: true,
  simulatePaymentMode: true, // Activated by default in development/test so payments can be tested right away
  contactWhatsapp: '(62) 99999-8282',
  contactEmail: 'contato@neonvelvet.com.br',
  theme: {
    primaryColor: '#d946ef', // Neon Fuchsia
    secondaryColor: '#8b5cf6', // Violet
    accentColor: '#06b6d4', // Electric Cyan
    headingFont: 'Syne',
    bodyFont: 'Plus Jakarta Sans',
    logoUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=1600&q=80',
    djPhotoUrl: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=800&q=80',
    djName: 'DJ KAZZ & SPECIAL GUESTS',
    ambientEffect: 'party-lights',
  },
  aboutText: 'Uma experiência audiovisual imersiva no coração de Goiânia. Sistema de som de alta definição, iluminação robótica e uma atmosfera noturna inesquecível feita para os amantes da boa música eletrônica e diversão sofisticada.',
  lineup: [
    {
      name: 'DJ KAZZ',
      role: 'Headliner - Tech House / Melodic',
      time: '01:00 - 03:30',
      image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'LUMINA DUO',
      role: 'Live Set & Percussão',
      time: '23:30 - 01:00',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'RESIDENT BEATS',
      role: 'Warm Up',
      time: '22:00 - 23:30',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    },
  ],
  rules: [
    'Classificação etária estrita: 18 anos completos na data do evento.',
    'Obrigatória apresentação de documento oficial original com foto (RG, CNH ou Passaporte físico ou via app oficial gov.br).',
    'Ingresso pessoal e intransferível após validação na portaria.',
    'Proibida a entrada com bebidas alcoólicas externas, copos térmicos, objetos cortantes ou armas.',
    'Direito de arrependimento e reembolso conforme Código de Defesa do Consumidor: até 7 dias corridos após a compra e no mínimo 48h antes do evento.',
  ],
  faqs: [
    {
      question: 'Como recebo meu ingresso após o pagamento?',
      answer: 'Imediatamente após a aprovação do Pix, o sistema gera seu ingresso com QR Code exclusivo na tela. Você pode baixá-lo como imagem, enviar diretamente para seu WhatsApp ou consultar a qualquer momento com seu CPF e telefone.',
    },
    {
      question: 'O que inclui o ingresso Open Bar?',
      answer: 'O Open Bar é exclusivo para apenas 60 pessoas e inclui: Cervejas Premium selecionadas, Gin Importado, Vodka Premium, Energético, Tônica, Água e Refrigerante liberados das 22h00 às 04h00 em bar e lounge dedicados.',
    },
    {
      question: 'Posso transferir meu ingresso para outra pessoa?',
      answer: 'Sim, você pode alterar a titularidade entrando em contato com a organização com até 24 horas de antecedência ao evento, apresentando os dados do novo titular.',
    },
    {
      question: 'Preciso imprimir o ingresso?',
      answer: 'Não! Basta apresentar o QR Code na tela do seu celular com o brilho ajustado para que nossa equipe faça a leitura rápida na portaria.',
    },
  ],
  ticketTypes: [
    {
      id: 'pista',
      name: 'Pista Geral',
      badge: 'Acesso Principal',
      description: 'Acesso completo à pista de dança, bares centrais, praça de alimentação e banheiros.',
      price: 60.00,
      batchName: '1º Lote',
      maxQuantity: 260,
      soldQuantity: 114,
      features: [
        'Acesso a todas as atrações da pista',
        'Bares e pontos de atendimento',
        'Estacionamento conveniado no local',
        'Experiência sonora e iluminação imersiva',
      ],
      color: '#8b5cf6',
      active: true,
    },
    {
      id: 'open-bar',
      name: 'Camarote Open Bar',
      badge: 'Exclusivo (Máx 60)',
      description: 'Área VIP elevada, banheiros privativos e bebidas liberadas a noite toda com garçons dedicados.',
      price: 150.00,
      batchName: 'Lote Único Limitado',
      maxQuantity: 60,
      soldQuantity: 48,
      features: [
        'Apenas 60 unidades disponíveis',
        'Cerveja Premium, Vodka, Gin, Energético e Tônica liberados',
        'Área elevada com visão privilegiada da cabine do DJ',
        'Entrada e bar exclusivos sem filas na portaria',
      ],
      color: '#d946ef',
      active: true,
    },
  ],
};
