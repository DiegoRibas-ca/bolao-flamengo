# 🔥 Bolão Flamengo 2026

Aplicativo completo para bolão dos jogos do Flamengo com sistema de pontuação avançado, administração e classificação em tempo real.

## 🚀 Stack

- **Frontend**: HTML/CSS/JavaScript vanilla
- **Backend/Database**: Firebase (Firestore)
- **Hospedagem**: GitHub Pages (grátis) + Firebase (plano gratuito)

## 💰 Custos

- **GitHub Pages**: Grátis
- **Firebase**: Plano gratuito (Spark) inclui:
  - 1 GB de storage
  - 10 GB de transferência/mês
  - 50K leituras/dia
  - 20K escritas/dia
  - Perfeito para uso pessoal!

## 📋 Pré-requisitos

1. Conta no GitHub
2. Conta no Firebase (Google)
3. Node.js instalado (opcional, só para rodar localmente)

## 🔧 Configuração

### 1. Configurar Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative o **Firestore Database**
4. Vá em **Project Settings** > **General** > **Your apps**
5. Adicione uma Web app
6. Copie as credenciais do Firebase

### 2. Configurar o App

1. Adicione o Firebase SDK no `index.html` antes do fechamento do `</body>`:
   - Veja o arquivo `firebase-init.html` para o código completo
   - Copie o conteúdo e cole no `index.html`
   - Substitua as credenciais com as suas do Firebase

2. O `app.js` já está configurado para usar Firebase quando disponível
   - Se Firebase não estiver configurado, funciona em modo offline com dados de exemplo

### 4. Estrutura do Firestore

Veja o arquivo `FIRESTORE_DATA.md` para a estrutura completa e exemplos.

Coleções necessárias:
- **championships**: Campeonatos com pesos
- **games**: Jogos do calendário 2026
- **bets**: Palpites dos participantes (com marcadores)
- **users**: Usuários e administradores
- **players**: Elenco do Flamengo
- **config**: Configurações de pontuação

**IMPORTANTE**: Crie um usuário admin inicial:
- Email: `admin@flamengo.com` (ou o que preferir)
- Senha: escolha uma senha
- `isAdmin`: `true`

### 5. Regras de Segurança do Firestore

No Firebase Console, vá em **Firestore Database** > **Rules** e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura pública
    match /{document=**} {
      allow read: if true;
    }
    
    // Escrita apenas autenticada (ou ajuste conforme necessário)
    match /bets/{betId} {
      allow write: if request.auth != null || true; // Temporário para teste
    }
    
    match /games/{gameId} {
      allow write: if true; // Ajuste conforme necessário
    }
  }
}
```

## 🏃 Rodar Localmente

```bash
npm install
npm run dev
```

Ou simplesmente abra `index.html` no navegador (alguns recursos podem não funcionar sem servidor).

## 📤 Deploy no GitHub Pages

1. Crie um repositório no GitHub
2. Faça push do código:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/app-bolao.git
git push -u origin main
```

3. No GitHub, vá em **Settings** > **Pages**
4. Selecione a branch `main` e pasta `/ (root)`
5. Seu app estará em: `https://seu-usuario.github.io/app-bolao/`

## 🎯 Funcionalidades

### Para Participantes:
- ✅ Login com email e senha (sistema de convites)
- ✅ Visualizar tabela de classificação bonita (similar ao screenshot)
- ✅ Visualizar jogos por campeonato e status
- ✅ Fazer palpites com:
  - Placar (gols Flamengo x Adversário)
  - Marcadores de gols do Flamengo (múltiplos gols do mesmo jogador permitidos)
  - Limite máximo de gols configurável
- ✅ Ver seus próprios palpites e pontuação
- ✅ Visualizar ranking geral e por campeonato

### Sistema de Pontuação Avançado:
- ✅ **Cravar placar exato**: Pontos máximos (peso configurável × peso do campeonato)
- ✅ **Acertar resultado**: Vitória/Empate/Derrota do Flamengo
- ✅ **Acertar gols de um time**: Pontos por acertar número de gols
- ✅ **Acertar marcadores**: Pontos por cada marcador de gol acertado
- ✅ Pesos diferentes por campeonato
- ✅ Contagem de "Cravudinhas" (placares exatos)

### Para Administradores:
- ✅ Painel administrativo completo
- ✅ Gerenciar configurações de pontuação (pesos dinâmicos)
- ✅ Gerenciar jogos do calendário 2026
- ✅ Gerenciar elenco do Flamengo (adicionar/remover jogadores)
- ✅ Sistema de convites por email
- ✅ Editar placares e status dos jogos
- ✅ Registrar marcadores de gols nos jogos finalizados

## 🔄 Próximos Passos

1. **Configurar Firebase**: Siga o guia em `FIREBASE_SETUP.md`
2. **Criar dados iniciais**: Veja `FIRESTORE_DATA.md` para estrutura completa
3. **Criar usuário admin**: Adicione manualmente no Firestore ou use a interface após primeiro login
4. **Adicionar jogos**: Use o painel admin para adicionar jogos do calendário 2026
5. **Adicionar elenco**: Use o painel admin para adicionar jogadores do Flamengo
6. **Convidar participantes**: Use o painel admin para enviar convites

## 🔒 Segurança

**IMPORTANTE**: 
- Em produção, NUNCA armazene senhas em texto plano
- Use Firebase Authentication ou implemente hash de senhas (bcrypt)
- Configure as regras de segurança do Firestore (veja `FIRESTORE_DATA.md`)
- Limite acesso ao painel admin apenas para usuários autorizados

## 📝 Notas

- Este é um projeto pessoal e funcional, não precisa ser super estruturado
- O código está pronto para integração com Firebase
- Você pode expandir conforme necessário
