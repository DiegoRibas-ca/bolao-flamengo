# 📊 Estrutura de Dados do Firestore

Este documento descreve a estrutura de dados necessária no Firestore.

## Coleções

### 1. `championships` (Campeonatos)

Documentos com os seguintes campos:
- `id`: ID do documento (ex: "brasileirao")
- `name`: Nome do campeonato (ex: "Brasileirão Série A")
- `weight`: Peso do campeonato (número, ex: 3)

**Exemplo de documentos iniciais:**

```
brasileirao:
  name: "Brasileirão Série A"
  weight: 3

libertadores:
  name: "CONMEBOL Libertadores 2026"
  weight: 5

copa_brasil:
  name: "Copa Betano do Brasil"
  weight: 4

mundial:
  name: "Mundial de Clubes FIFA"
  weight: 6
```

### 2. `games` (Jogos)

Documentos com os seguintes campos:
- `championship`: ID do campeonato (string)
- `opponent`: Nome do adversário (string)
- `date`: Data/hora do jogo (Timestamp)
- `flamengoScore`: Gols do Flamengo (number, nullable)
- `opponentScore`: Gols do adversário (number, nullable)
- `status`: Status do jogo - "upcoming", "live", "finished" (string)
- `scorers`: Array de IDs dos jogadores que marcaram (array de strings, opcional)

**Exemplo:**
```
game_001:
  championship: "brasileirao"
  opponent: "Palmeiras"
  date: Timestamp(2026-03-15 20:00:00)
  flamengoScore: null
  opponentScore: null
  status: "upcoming"
  scorers: []
```

### 3. `bets` (Palpites)

Documentos com os seguintes campos:
- `userId`: ID do usuário (string)
- `gameId`: ID do jogo (string)
- `flamengoScore`: Gols do Flamengo no palpite (number)
- `opponentScore`: Gols do adversário no palpite (number)
- `scorers`: Array de IDs dos jogadores marcadores (array de strings)
- `timestamp`: Data/hora do palpite (Timestamp)

**ID do documento:** `{userId}_{gameId}` (ex: "user123_game001")

### 4. `users` (Usuários)

Documentos com os seguintes campos:
- `email`: Email do usuário (string)
- `name`: Nome do usuário (string)
- `password`: Senha (string) - **EM PRODUÇÃO, USE HASH!**
- `isAdmin`: Se é administrador (boolean)
- `invited`: Se foi convidado (boolean)
- `createdAt`: Data de criação (Timestamp)

**ID do documento:** Email sanitizado (ex: "user_example_com")

**Usuário Admin inicial:**
```
admin:
  email: "admin@flamengo.com"
  name: "Administrador"
  password: "admin123"  # MUDAR EM PRODUÇÃO!
  isAdmin: true
  invited: false
  createdAt: Timestamp(now)
```

### 5. `players` (Elenco)

Documentos com os seguintes campos:
- `name`: Nome do jogador (string)
- `number`: Número da camisa (number, nullable)

**Exemplo:**
```
player_001:
  name: "Gabigol"
  number: 10

player_002:
  name: "Pedro"
  number: 9
```

### 6. `config` (Configurações)

Documento único com ID "main":
- `maxGoals`: Máximo de gols permitido em um palpite (number)
- `weights`: Objeto com pesos de pontuação
  - `exactScore`: Peso para placar exato (number)
  - `correctResult`: Peso para acertar resultado (number)
  - `correctGoals`: Peso para acertar gols de um time (number)
  - `correctScorers`: Peso por marcador acertado (number)

**Exemplo:**
```
main:
  maxGoals: 20
  weights:
    exactScore: 10
    correctResult: 3
    correctGoals: 2
    correctScorers: 5
```

## Regras de Segurança do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura pública para campeonatos, jogos e configurações
    match /championships/{champId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    match /config/{configId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Palpites: usuários podem ler seus próprios e criar/editar
    match /bets/{betId} {
      allow read: if true; // Todos podem ler para ver ranking
      allow create, update: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow delete: if false;
    }
    
    // Usuários: leitura pública limitada, escrita apenas admin
    match /users/{userId} {
      allow read: if true; // Para ranking
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true ||
         request.auth.uid == userId); // Pode editar próprio perfil
    }
    
    // Jogadores: leitura pública, escrita apenas admin
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## Script de Inicialização

Você pode criar os dados iniciais manualmente no Firebase Console ou usar um script. Aqui está um exemplo de estrutura JSON que você pode importar:

```json
{
  "championships": {
    "brasileirao": {
      "name": "Brasileirão Série A",
      "weight": 3
    },
    "libertadores": {
      "name": "CONMEBOL Libertadores 2026",
      "weight": 5
    },
    "copa_brasil": {
      "name": "Copa Betano do Brasil",
      "weight": 4
    },
    "mundial": {
      "name": "Mundial de Clubes FIFA",
      "weight": 6
    }
  },
  "config": {
    "main": {
      "maxGoals": 20,
      "weights": {
        "exactScore": 10,
        "correctResult": 3,
        "correctGoals": 2,
        "correctScorers": 5
      }
    }
  }
}
```

## Notas Importantes

1. **Senhas**: Em produção, NUNCA armazene senhas em texto plano. Use Firebase Authentication ou implemente hash (bcrypt, etc.)

2. **Timestamps**: Use `Timestamp` do Firestore para datas, não strings

3. **IDs**: Use IDs descritivos para documentos que não mudam (como campeonatos), e IDs gerados para documentos dinâmicos (como jogos e palpites)

4. **Índices**: O Firestore pode pedir para criar índices compostos para queries complexas. Siga as instruções quando aparecerem
