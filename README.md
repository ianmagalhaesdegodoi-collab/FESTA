# 🎟️ VibePass — Sistema de Ingressos para Balada & Scanner de Portaria

Sistema completo para festas e boates noturnas (DJ / Balada), 100% em português do Brasil, mobile-first, com checkout Pix instantâneo, rastreamento de links de WhatsApp (`?g=slug`), painel administrativo com controle de acesso (Admin vs Staff) e scanner de portaria com validação atômica anti-fraude.

---

## ⚡ Módulos Entregues

1. **Site Público de Vendas (`/`)**:
   - Hero com tema noturno, neon glow, contagem regressiva ao vivo e botão de compra rápida.
   - Categorias de ingressos: **Pista Geral** e **Camarote Open Bar** (com teto estrito de 60 unidades e capacidade total de 320 vagas).
   - Informações da festa, Line-up dos DJs, mapa para o **Espaço 82 Eventos (Goiânia)**, regras de entrada (18+, documento com foto, reembolso CDC) e FAQ.
   - Checkout com validação matemática de CPF, bloqueio de menores de 18 anos, máscara de WhatsApp e Pix Copia e Cola + QR Code com expiração de 15 minutos.
   - Rastreamento de origem por parâmetro `?g=slug-do-grupo` com contagem automática de cliques e taxa de conversão.
   - Página **Meu Ingresso (`/ingresso/:token`)** com QR Code de alta resolução, botão de **Baixar Imagem PNG** e botão de **Enviar por WhatsApp**.
   - Busca de ingressos por CPF e WhatsApp (`/meus-ingressos`).

2. **Painel Administrativo (`/admin`)**:
   - Protegido por autenticação com controle de papéis (Admin vs Portaria/Staff).
   - **Dashboard**: Faturamento total (R$), ingressos emitidos, check-ins realizados, vagas restantes e vendas por lote.
   - **Grupos de WhatsApp**: Cadastro de grupos, gerador de link `?g=slug`, estatísticas de visitas, vendas, faturamento e ranking com destaque para o grupo líder.
   - **Vendas e Ingressos**: Busca por nome/CPF/WhatsApp, filtros por status, exportação para CSV e cancelamento.
   - **Configurações da Festa**: Edição de nome, data, horário, local, textos, capacidade, limite do Open Bar, cores neon do tema e chave do modo simulação.
   - **Equipe**: Cadastro de novos administradores e operadores de portaria.
   - **Guia Integrado**: Documentação com passo a passo exibido direto na interface.

3. **Scanner de Portaria Mobile (`/scanner`)**:
   - Leitura em tempo real pela câmera do celular com permissão automática.
   - Contador de check-ins no cabeçalho em tempo real.
   - Validação server-side atômica com trava de concorrência (impede uso duplo mesmo com dois celulares escaneando ao mesmo segundo).
   - Tela de conferência com CPF mascarado, tipo de ingresso e botões grandes de liberação.
   - Feedback auditivo (dois tons de confirmação) e vibração háptica no celular.
   - Indicador de conexão (online/offline) e busca manual de contingência por CPF ou código.

---

## 🚀 Como Configurar e Colocar em Produção

### 1. Criar o Projeto no Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um novo projeto.
2. No menu lateral, acesse **Firestore Database** > clique em **Criar banco de dados** (escolha modo produção).
3. Em **Authentication** > **Método de login**, habilite o provedor **E-mail/senha**.

### 2. Onde Colar as Chaves
Copie as variáveis do arquivo `.env.example` para o seu arquivo `.env`:
```env
# Mercado Pago ou Asaas (Preencha UM para pagamentos reais)
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
# OU
ASAAS_API_KEY="$aact_..."
ASAAS_SANDBOX="false"

# Firebase (Opcional - caso queira leitura direta client-side)
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="seu-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="seu-app"
VITE_FIREBASE_STORAGE_BUCKET="seu-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456:web:abcd"

# Para testes sem custo, mantenha true; em produção com chave, mude para false:
SIMULATE_PAYMENTS="false"
```

### 3. Como Publicar as Security Rules
1. No [Firebase Console](https://console.firebase.google.com), vá até **Firestore Database** > aba **Regras (Rules)**.
2. Abra o arquivo `firestore.rules` gerado na raiz deste projeto.
3. Copie todo o código e cole no console do Firebase.
4. Clique no botão **Publicar**. As regras protegem pedidos, tokens secretos e impedem acesso não autorizado a dados financeiros.

### 4. Como Criar o Primeiro Administrador
1. No Firebase Console > **Authentication** > **Users**, clique em **Adicionar usuário** e crie um usuário com e-mail e senha (ex: `admin@vibepass.com`).
2. No Firestore Database, crie um documento na coleção `admins` com o ID sendo exatamente o `UID` do usuário recém-criado:
   - Caminho: `admins/{UID_DO_USUARIO}`
   - Campos: `{ "role": "admin", "email": "admin@vibepass.com" }`
3. Alternativamente, no painel administrativo `/admin`, você pode usar as contas de demonstração pré-configuradas para testar imediatamente.

### 5. Como Plugar o Pix Real

#### Opção A: Mercado Pago Pix
1. Crie uma aplicação em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers).
2. Obtenha seu **Access Token de Produção** (começa com `APP_USR-`).
3. Cole em `MERCADO_PAGO_ACCESS_TOKEN` no `.env`.
4. Configure a URL de notificação webhook no Mercado Pago para:
   `https://seu-dominio.com/api/payment/webhook?provider=mercadopago`

#### Opção B: Asaas Pix
1. Crie sua conta em [asaas.com](https://www.asaas.com).
2. Vá em **Configurações > Integrações > Chaves de API** e gere uma chave.
3. Cole em `ASAAS_API_KEY` no `.env`.
4. Configure a URL de webhook no Asaas para:
   `https://seu-dominio.com/api/payment/webhook?provider=asaas`

---

## 📝 Lista do que Falta Preencher (Checklist do Dono do Evento)

Tudo isso pode ser configurado diretamente pela aba **"Configurações Festa"** no Painel Admin (`/admin`), sem tocar em código:

- [ ] **Artes e Banners**:
  - Banner principal do hero (resolução recomendada: 1600x800).
  - Logo da festa ou da boate (quadrada ou redonda).
  - Foto do DJ ou atração principal (resolução recomendada: 800x800).
- [ ] **Fontes e Cores**:
  - Ajuste das cores neon de destaque (Rosa Fuchsia, Violeta e Ciano Elétrico já definidos como padrão).
- [ ] **Preços e Lotes**:
  - Definir os valores finais da Pista (ex: R$ 60,00) e do Camarote Open Bar (ex: R$ 150,00).
  - Confirmar a capacidade total da boate (padrão 320 pessoas) e o limite do Open Bar (máximo 60 pessoas).
- [ ] **Textos Oficiais**:
  - Biografia ou descrição da experiência e nomes completos dos DJs do line-up.
  - Endereço exato no Setor Sul de Goiânia.
- [ ] **Chaves de Pagamento**:
  - Inserir o token do Mercado Pago ou Asaas nas variáveis de ambiente e desmarcar o Modo Simulação.
