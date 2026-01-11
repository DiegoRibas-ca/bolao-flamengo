# Configuração do Firestore

## Criar Coleções Manualmente

Se você estiver tendo problemas com a importação de jogadores, pode ser necessário criar as coleções manualmente no Firestore. Siga estes passos:

### 1. Acessar o Console do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: `bolao-do-mengao`
3. No menu lateral, clique em **Firestore Database**

### 2. Criar a Coleção "players"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `players`
3. Clique em **"Próximo"**
4. Adicione um documento de exemplo:
   - **ID do documento**: Deixe em branco (gerar automaticamente)
   - **Campo 1**: 
     - Campo: `name`
     - Tipo: `string`
     - Valor: `Arrascaeta`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `number`
     - Tipo: `number`
     - Valor: `10`
     - **Obrigatório**: Não (pode ser `null`)
   - **Campo 3**:
     - Campo: `abbreviation`
     - Tipo: `string`
     - Valor: `AR`
     - **Obrigatório**: Não (pode ser `null`, mas se fornecido deve ter exatamente 2 letras)
5. Clique em **"Salvar"**
6. Você pode deletar este documento de exemplo depois

**Estrutura completa da coleção `players`:**
```
players/
  {documentId}/
    name: string (obrigatório) - Exemplo: "Arrascaeta"
    number: number (opcional, pode ser null) - Exemplo: 10
    abbreviation: string (opcional, pode ser null, 2 letras) - Exemplo: "AR"
```

**Nota importante**: Os campos `number` e `abbreviation` são opcionais. Se não forem fornecidos, devem ser `null` ou simplesmente não incluídos no documento.

### 3. Criar a Coleção "bets"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `bets`
3. Clique em **"Próximo"**
4. Adicione um documento de exemplo:
   - **ID do documento**: Deixe em branco (gerar automaticamente)
   - **Campo 1**: 
     - Campo: `userId`
     - Tipo: `string`
     - Valor: `user_example`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `gameId`
     - Tipo: `string`
     - Valor: `game_example`
     - **Obrigatório**: Sim
   - **Campo 3**:
     - Campo: `flamengoScore`
     - Tipo: `number`
     - Valor: `2`
     - **Obrigatório**: Sim
   - **Campo 4**:
     - Campo: `opponentScore`
     - Tipo: `number`
     - Valor: `1`
     - **Obrigatório**: Sim
   - **Campo 5**:
     - Campo: `scorers`
     - Tipo: `array`
     - Valor: `["player_id_1", "player_id_2"]` (array de strings com IDs dos jogadores)
     - **Obrigatório**: Não (pode ser array vazio `[]`)
   - **Campo 6**:
     - Campo: `timestamp`
     - Tipo: `timestamp`
     - Valor: Data/hora atual
     - **Obrigatório**: Sim
5. Clique em **"Salvar"**
6. Você pode deletar este documento de exemplo depois

**Estrutura completa da coleção `bets`:**
```
bets/
  {documentId}/
    userId: string (obrigatório) - ID do usuário que fez o palpite
    gameId: string (obrigatório) - ID do jogo
    flamengoScore: number (obrigatório) - Gols do Flamengo no palpite
    opponentScore: number (obrigatório) - Gols do adversário no palpite
    scorers: array (opcional) - Array de strings com IDs dos jogadores que marcaram gols
    timestamp: timestamp (obrigatório) - Data/hora em que o palpite foi feito
```

### 4. Criar a Coleção "config"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `config`
3. Clique em **"Próximo"**
4. Adicione um documento:
   - **ID do documento**: `main` (IMPORTANTE: use exatamente "main")
   - **Campo 1**: 
     - Campo: `maxGoals`
     - Tipo: `number`
     - Valor: `20`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `weights`
     - Tipo: `map` (objeto)
     - Valor: Clique em "Adicionar campo" dentro do map e adicione:
       - `exactScore`: `number` = `10`
       - `correctResult`: `number` = `5`
       - `correctGoals`: `number` = `3`
       - `correctScorers`: `number` = `2`
     - **Obrigatório**: Sim
   - **Campo 3**:
     - Campo: `championshipWeights`
     - Tipo: `map` (objeto)
     - Valor: Objeto com IDs de campeonatos como chaves e números como valores
       - Exemplo: `brasileirao`: `1.5`, `libertadores`: `2.0`
     - **Obrigatório**: Sim (pode ser objeto vazio `{}`)
5. Clique em **"Salvar"**

**Estrutura completa da coleção `config`:**
```
config/
  main/  (ID do documento deve ser exatamente "main")
    maxGoals: number (obrigatório) - Máximo de gols permitidos por palpite
    weights: map (obrigatório) - Objeto com os pesos de pontuação:
      exactScore: number - Pontos por placar exato
      correctResult: number - Pontos por acertar resultado (vitória/empate/derrota)
      correctGoals: number - Pontos por acertar gols de um time
      correctScorers: number - Pontos por cada marcador acertado
    championshipWeights: map (obrigatório) - Objeto com multiplicadores por campeonato:
      {championshipId}: number - Multiplicador para o campeonato
      Exemplo: "brasileirao": 1.5, "libertadores": 2.0
```

**Exemplo completo do documento `config/main`:**
```json
{
  "maxGoals": 20,
  "weights": {
    "exactScore": 10,
    "correctResult": 5,
    "correctGoals": 3,
    "correctScorers": 2
  },
  "championshipWeights": {
    "brasileirao": 1.5,
    "libertadores": 2.0,
    "copa_brasil": 1.5,
    "mundial": 3.0
  }
}
```

### 5. Criar a Coleção "games"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `games`
3. Clique em **"Próximo"**
4. Adicione um documento de exemplo:
   - **ID do documento**: Deixe em branco (gerar automaticamente)
   - **Campo 1**: 
     - Campo: `championship`
     - Tipo: `string`
     - Valor: `brasileirao`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `opponent`
     - Tipo: `string`
     - Valor: `Palmeiras`
     - **Obrigatório**: Sim
   - **Campo 3**:
     - Campo: `date`
     - Tipo: `timestamp`
     - Valor: Data/hora atual
     - **Obrigatório**: Sim
   - **Campo 4**:
     - Campo: `status`
     - Tipo: `string`
     - Valor: `upcoming` (ou `live` ou `finished`)
     - **Obrigatório**: Sim
   - **Campo 5**:
     - Campo: `flamengoScore`
     - Tipo: `number`
     - Valor: `null` ou deixe vazio
     - **Obrigatório**: Não (pode ser `null`)
   - **Campo 6**:
     - Campo: `opponentScore`
     - Tipo: `number`
     - Valor: `null` ou deixe vazio
     - **Obrigatório**: Não (pode ser `null`)
   - **Campo 7**:
     - Campo: `scorers`
     - Tipo: `array`
     - Valor: `[]` (array vazio ou array de strings com IDs dos jogadores)
     - **Obrigatório**: Não (pode ser array vazio `[]`)
5. Clique em **"Salvar"**
6. Você pode deletar este documento de exemplo depois

**Estrutura completa da coleção `games`:**
```
games/
  {documentId}/
    championship: string (obrigatório) - ID do campeonato (ex: "brasileirao", "libertadores")
    opponent: string (obrigatório) - Nome do adversário
    date: timestamp (obrigatório) - Data/hora do jogo
    status: string (obrigatório) - Status do jogo: "upcoming", "live" ou "finished"
    flamengoScore: number (opcional, pode ser null) - Gols do Flamengo
    opponentScore: number (opcional, pode ser null) - Gols do adversário
    scorers: array (opcional) - Array de strings com IDs dos jogadores que marcaram gols
```

### 6. Criar a Coleção "championships"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `championships`
3. Clique em **"Próximo"**
4. Adicione um documento de exemplo:
   - **ID do documento**: `brasileirao` (use o ID do campeonato)
   - **Campo 1**: 
     - Campo: `id`
     - Tipo: `string`
     - Valor: `brasileirao`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `name`
     - Tipo: `string`
     - Valor: `Brasileirão`
     - **Obrigatório**: Sim
5. Clique em **"Salvar"**

**Estrutura completa da coleção `championships`:**
```
championships/
  {championshipId}/  (ID deve ser o mesmo que o campo "id")
    id: string (obrigatório) - ID do campeonato (ex: "brasileirao")
    name: string (obrigatório) - Nome do campeonato (ex: "Brasileirão")
```

### 7. Criar a Coleção "users"

1. Clique em **"Iniciar coleção"** ou **"Add collection"**
2. Nome da coleção: `users`
3. Clique em **"Próximo"**
4. Adicione um documento de exemplo (para criar o usuário admin):
   - **ID do documento**: `admin` (ou qualquer ID único)
   - **Campo 1**: 
     - Campo: `email`
     - Tipo: `string`
     - Valor: `admin@flamengo.com`
     - **Obrigatório**: Sim
   - **Campo 2**:
     - Campo: `name`
     - Tipo: `string`
     - Valor: `Administrador`
     - **Obrigatório**: Sim
   - **Campo 3**:
     - Campo: `password`
     - Tipo: `string`
     - Valor: `admin123` (senha temporária)
     - **Obrigatório**: Sim
   - **Campo 4**:
     - Campo: `isAdmin`
     - Tipo: `boolean`
     - Valor: `true`
     - **Obrigatório**: Sim
   - **Campo 5**:
     - Campo: `invited`
     - Tipo: `boolean`
     - Valor: `true`
     - **Obrigatório**: Não (opcional)
   - **Campo 6**:
     - Campo: `createdAt`
     - Tipo: `timestamp`
     - Valor: Data/hora atual
     - **Obrigatório**: Não (opcional)
5. Clique em **"Salvar"**

**Estrutura completa da coleção `users`:**
```
users/
  {userId}/
    email: string (obrigatório) - Email do usuário
    name: string (obrigatório) - Nome do usuário
    password: string (obrigatório) - Senha (em produção, usar hash)
    isAdmin: boolean (obrigatório) - Se é administrador
    invited: boolean (opcional) - Se foi convidado
    createdAt: timestamp (opcional) - Data de criação
```

### 8. Verificar Todas as Coleções

Certifique-se de que as seguintes coleções existem:
- ✅ `players` (para jogadores) - Detalhado acima
- ✅ `games` (para jogos) - Detalhado acima
- ✅ `users` (para usuários) - Detalhado acima
- ✅ `bets` (para palpites) - Detalhado acima
- ✅ `championships` (para campeonatos) - Detalhado acima
- ✅ `config` (para configurações) - Detalhado acima

## Regras de Segurança do Firestore

⚠️ **PROBLEMA IDENTIFICADO**: Você está recebendo "Missing or insufficient permissions" porque as regras de segurança estão bloqueando a escrita.

**Como o app atual não usa Firebase Authentication** (usa login simples), você precisa usar regras permissivas para desenvolvimento.

### ⚠️ IMPORTANTE: Regras para Desenvolvimento

**⚠️ ATENÇÃO**: O app atual **não usa Firebase Authentication**, então as regras precisam ser mais permissivas. 

**Escolha uma opção baseado no seu caso:**

#### Opção A: Regras Permissivas (Apenas para App Pessoal/Privado) ⚠️

**Use APENAS se:**
- É um app pessoal/privado
- Não será acessado publicamente na internet
- Você confia em todos que têm acesso ao link

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ RISCOS:**
- ❌ Qualquer pessoa com o link pode modificar/deletar dados
- ❌ Não há proteção contra acesso não autorizado
- ❌ Dados podem ser comprometidos

#### Opção B: Regras Intermediárias (Recomendado) ✅

**Mais seguras, validam estrutura dos dados, mas ainda permitem escrita:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura pública (necessário para o app funcionar)
    match /{document=**} {
      allow read: if true;
    }
    
    // Escrita com validação de estrutura básica
    match /players/{playerId} {
      allow write: if request.resource.data.keys().hasAll(['name']) &&
                     request.resource.data.name is string &&
                     request.resource.data.name.size() > 0;
    }
    
    match /games/{gameId} {
      allow write: if request.resource.data.keys().hasAll(['championship', 'opponent', 'date', 'status']) &&
                     request.resource.data.championship is string &&
                     request.resource.data.opponent is string &&
                     request.resource.data.status is string;
    }
    
    match /bets/{betId} {
      allow write: if request.resource.data.keys().hasAll(['userId', 'gameId', 'flamengoScore', 'opponentScore']) &&
                     request.resource.data.userId is string &&
                     request.resource.data.gameId is string &&
                     request.resource.data.flamengoScore is int &&
                     request.resource.data.opponentScore is int;
    }
    
    match /config/{configId} {
      allow write: if request.resource.data.keys().hasAll(['maxGoals', 'weights', 'championshipWeights']);
    }
    
    match /users/{userId} {
      allow write: if request.resource.data.keys().hasAll(['email', 'name', 'password', 'isAdmin']) &&
                     request.resource.data.email is string &&
                     request.resource.data.name is string &&
                     request.resource.data.isAdmin is bool;
    }
    
    match /championships/{champId} {
      allow write: if request.resource.data.keys().hasAll(['id', 'name']) &&
                     request.resource.data.id is string &&
                     request.resource.data.name is string;
    }
  }
}
```

**Vantagens:**
- ✅ Valida estrutura dos dados antes de salvar
- ✅ Previne dados malformados
- ✅ Ainda permite escrita (necessário sem Firebase Auth)
- ✅ Um pouco mais seguro que permitir tudo

**Limitações:**
- ⚠️ Ainda permite escrita de qualquer pessoa
- ⚠️ Não verifica se o usuário é admin
- ⚠️ Não é totalmente seguro para produção pública

**Como aplicar:**
1. Acesse **Firestore Database > Regras**
2. Cole as regras da **Opção B** acima
3. Clique em **"Publicar"**
4. Aguarde 30-60 segundos
5. Teste o app

**Após aplicar estas regras, você conseguirá:**
- ✅ Adicionar/editar jogadores
- ✅ Salvar configurações
- ✅ Importar jogos e jogadores
- ✅ Fazer todas as operações de escrita

### 🔒 Regras para Produção (Futuro - Requer Firebase Auth)

**NOTA**: As regras abaixo requerem Firebase Authentication. Como o app atual usa login simples (sem Firebase Auth), elas NÃO funcionarão agora.

**Para usar estas regras em produção, você precisaria:**
1. Implementar Firebase Authentication no app
2. Substituir o sistema de login atual por Firebase Auth
3. Então usar estas regras (que são realmente seguras):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players - leitura pública, escrita apenas para admins
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Games - leitura pública, escrita apenas para admins
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users - leitura própria, escrita apenas para admins
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Bets - leitura própria, escrita própria
    match /bets/{betId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Championships - leitura pública, escrita apenas para admins
    match /championships/{champId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Config - leitura pública, escrita apenas para admins
    match /config/{configId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

**Por enquanto, use as regras permissivas de desenvolvimento acima.**

## Solução de Problemas

### Erro: "Missing or insufficient permissions"

**Este é o erro que você está enfrentando!**

**Solução imediata:**
1. Acesse **Firestore Database > Regras** no Firebase Console
2. **Substitua** todas as regras por estas (regras permissivas para desenvolvimento):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Clique em **"Publicar"**
4. Aguarde alguns segundos
5. Tente novamente adicionar jogador ou salvar configurações

**Por que isso acontece?**
- O app não usa Firebase Authentication (usa login simples)
- As regras padrão do Firestore bloqueiam escrita sem autenticação
- Para desenvolvimento, precisamos de regras permissivas

### Erro: "Collection not found"

1. Crie a coleção manualmente (veja instruções acima)
2. Adicione pelo menos um documento de exemplo
3. Tente importar novamente

### Erro na Importação de Jogadores

1. Abra o console do navegador (F12)
2. Verifique as mensagens de erro detalhadas
3. Certifique-se de que:
   - A coleção `players` existe
   - As regras de segurança permitem escrita
   - Você está logado como admin
   - Os campos estão com os nomes exatos: `name`, `number`, `abbreviation`
   - O campo `number` é do tipo `number` (não string)
   - O campo `abbreviation` é do tipo `string` (não number)

### Verificar Compatibilidade dos Campos

**Para a coleção `players`, os campos devem ser exatamente:**
- ✅ `name` (string) - Nome do jogador
- ✅ `number` (number) - Número da camisa (pode ser null)
- ✅ `abbreviation` (string) - Abreviação de 2 letras (pode ser null)

**Campos que NÃO devem existir:**
- ❌ `nome` (deve ser `name`)
- ❌ `numero` (deve ser `number`)
- ❌ `abrev` (deve ser `abbreviation`)
- ❌ Qualquer outro campo além dos três acima

**Importante**: Se você criou a coleção com nomes diferentes, o app não conseguirá salvar. Os nomes dos campos devem ser exatamente como listado acima.

## ✅ Confirmação de Compatibilidade

**Seus campos estão CORRETOS!** ✅

Baseado na imagem que você mostrou, você criou a coleção `players` com os campos exatos que o app espera:
- ✅ `name`: "Arrascaeta" (string) - **CORRETO**
- ✅ `number`: 10 (number) - **CORRETO**
- ✅ `abbreviation`: "AR" (string) - **CORRETO**

**O problema provavelmente é:**
1. **Regras de Segurança**: As regras do Firestore podem estar bloqueando a escrita
2. **Usuário não é Admin**: Você precisa estar logado como admin para adicionar jogadores
3. **Erro no Console**: Verifique o console do navegador (F12) para ver erros específicos

**Para resolver:**
1. Verifique as regras de segurança (veja seção acima)
2. Certifique-se de estar logado como admin
3. Abra o console do navegador (F12) e tente adicionar um jogador
4. Veja qual erro aparece no console

## Diagnóstico de Problemas

### Passo a Passo para Diagnosticar

1. **Abra o Console do Navegador (F12)**
   - Vá na aba "Console"
   - Tente adicionar um jogador
   - Veja qual erro aparece

2. **Verifique se está logado como Admin**
   - No app, verifique se aparece seu nome no canto superior direito
   - Se não aparecer, faça login primeiro
   - Certifique-se de que o usuário tem `isAdmin: true` no Firestore

3. **Verifique as Regras de Segurança**
   - No Firebase Console, vá em **Firestore Database > Regras**
   - Para testar, use temporariamente as regras de desenvolvimento (permitir tudo)
   - Se funcionar com regras permissivas, o problema são as regras

4. **Verifique os Tipos de Dados**
   - No Firestore, abra um documento da coleção `players`
   - Verifique se:
     - `name` é do tipo **string** (não number)
     - `number` é do tipo **number** (não string)
     - `abbreviation` é do tipo **string** (não number)

### Erros Comuns e Soluções

#### Erro: "permission-denied"
**Causa**: Regras de segurança bloqueando escrita
**Solução**: 
1. Use temporariamente regras permissivas para testar
2. Ou certifique-se de estar logado como admin
3. Verifique se o usuário tem `isAdmin: true` no documento `users/{userId}`

#### Erro: "not-found"
**Causa**: Coleção não existe
**Solução**: 
1. Crie a coleção manualmente (veja instruções acima)
2. Adicione pelo menos um documento de exemplo

#### Erro: "invalid-argument"
**Causa**: Tipo de dado incorreto
**Solução**: 
1. Verifique se `number` é number (não string)
2. Verifique se `name` é string (não number)
3. Verifique se `abbreviation` é string (não number)

## Verificar se a Importação Funcionou

1. Acesse **Firestore Database** no console do Firebase
2. Clique na coleção `players`
3. Verifique se os jogadores foram adicionados
4. Se não aparecerem, verifique o console do navegador para erros

## Checklist de Compatibilidade

Antes de tentar adicionar jogadores, verifique:

- [ ] A coleção `players` existe no Firestore
- [ ] Você está logado no app
- [ ] Seu usuário tem `isAdmin: true` no documento `users/{seuUserId}`
- [ ] As regras de segurança permitem escrita (pelo menos temporariamente para testar)
- [ ] Os campos na coleção são exatamente: `name` (string), `number` (number), `abbreviation` (string)
- [ ] O console do navegador (F12) não mostra erros ao tentar adicionar
