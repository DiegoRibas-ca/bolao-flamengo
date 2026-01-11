# 🚀 Quick Start - Configuração de Variáveis de Ambiente

## Passo a Passo Rápido

### 1. Criar arquivo .env

Na raiz do projeto, crie um arquivo chamado `.env` com o seguinte conteúdo:

```env
FIREBASE_API_KEY=sua-api-key-aqui
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
FIREBASE_APP_ID=seu-app-id
```

**Nota:** Use as credenciais reais do seu projeto Firebase. Você pode encontrá-las no [Firebase Console](https://console.firebase.google.com/) → Configurações do Projeto → Seus apps.

### 2. Gerar firebase-config.js

Execute no terminal:

```bash
npm run config
```

Ou:

```bash
node generate-config.js
```

### 3. Pronto! ✅

O arquivo `firebase-config.js` será gerado e a aplicação funcionará normalmente.

## ⚠️ Importante

- O arquivo `.env` **NÃO** será commitado no Git (já está no .gitignore)
- O arquivo `firebase-config.js` **NÃO** será commitado no Git (já está no .gitignore)
- Use `.env.example` como referência para outros desenvolvedores

## 🔄 Quando mudar as credenciais

1. Edite o arquivo `.env`
2. Execute `npm run config` novamente
3. Pronto!
