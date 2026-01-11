# 🔥 Guia de Configuração do Firebase

## Passo a Passo Completo

### 1. Criar Projeto no Firebase

1. Acesse https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Escolha um nome (ex: "bolao-flamengo")
4. Desative o Google Analytics (não é necessário)
5. Clique em "Criar projeto"

### 2. Ativar Firestore Database

1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Começar no modo de teste" (para desenvolvimento)
4. Escolha uma localização (ex: southamerica-east1 - São Paulo)
5. Clique em "Ativar"

### 3. Configurar Regras de Segurança

1. Vá em "Firestore Database" > "Regras"
2. Substitua as regras por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura para todos
    match /{document=**} {
      allow read: if true;
    }
    
    // Permitir escrita em bets apenas se tiver userId
    match /bets/{betId} {
      allow create, update: if request.resource.data.userId != null;
      allow delete: if false;
    }
    
    // Permitir escrita em games (você pode restringir depois)
    match /games/{gameId} {
      allow write: if true;
    }
    
    // Permitir escrita em users
    match /users/{userId} {
      allow write: if true;
    }
    
    // Permitir escrita em championships
    match /championships/{champId} {
      allow write: if true;
    }
  }
}
```

3. Clique em "Publicar"

### 4. Obter Credenciais da Web App

1. No menu lateral, clique no ícone de engrenagem ⚙️ > "Configurações do projeto"
2. Role até "Seus apps"
3. Clique no ícone `</>` (Web)
4. Escolha um nome para o app (ex: "bolao-web")
5. **NÃO** marque "Também configurar o Firebase Hosting"
6. Clique em "Registrar app"
7. Copie o objeto `firebaseConfig` que aparece

### 5. Configurar no Código

1. Abra `app.js`
2. Substitua o objeto `firebaseConfig` com suas credenciais
3. Descomente/ajuste as importações do Firebase

### 6. Adicionar Firebase SDK ao HTML

Adicione antes do fechamento do `</body>` no `index.html`:

```html
<!-- Firebase SDK -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
  import { getFirestore, collection, getDocs, setDoc, doc, query, where, onSnapshot, addDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
  
  // Suas credenciais
  const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
  };
  
  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Exportar para uso global
  window.firebaseDb = db;
  window.firebaseFunctions = {
    collection,
    getDocs,
    setDoc,
    doc,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc
  };
</script>
```

### 7. Criar Dados Iniciais

No Firebase Console, vá em "Firestore Database" e crie manualmente:

**Coleção: championships**
- Documento 1:
  - `id`: "brasileirao"
  - `name`: "Brasileirão"
  - `weight`: 3
- Documento 2:
  - `id`: "libertadores"
  - `name`: "Libertadores"
  - `weight`: 5
- Documento 3:
  - `id`: "copa_brasil"
  - `name`: "Copa do Brasil"
  - `weight`: 4
- Documento 4:
  - `id`: "carioca"
  - `name`: "Carioca"
  - `weight`: 2

### 8. Testar

1. Abra o `index.html` no navegador
2. Faça login
3. Tente fazer um palpite
4. Verifique no Firebase Console se os dados foram salvos

## 💡 Dicas

- Use o Firebase Console para visualizar os dados em tempo real
- Você pode criar jogos diretamente pelo console para testar
- O plano gratuito é suficiente para uso pessoal
- Se precisar de mais recursos, o plano Blaze (pago conforme uso) também é muito barato para projetos pequenos
