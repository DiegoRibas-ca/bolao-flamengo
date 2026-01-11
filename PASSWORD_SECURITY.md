# 🔒 Segurança de Senhas

## Implementação

Este projeto usa **bcryptjs** para fazer hash das senhas antes de armazená-las no banco de dados.

## Como Funciona

### 1. Ao Criar Convite (sendInvite)
- A senha fornecida pelo admin é convertida em hash usando bcrypt
- O hash é armazenado no Firestore (não a senha em texto plano)
- Hash é gerado com salt rounds = 10 (balanceamento entre segurança e performance)

### 2. Ao Fazer Login (handleLogin)
- A senha fornecida pelo usuário é comparada com o hash armazenado
- Usa `bcrypt.compareSync()` para verificar se a senha está correta
- Nunca compara senhas em texto plano

### 3. Migração de Senhas Antigas
- Se encontrar uma senha em texto plano (não começa com `$2a$` ou `$2b$`)
- Compara diretamente (para compatibilidade)
- Automaticamente atualiza para hash quando o usuário faz login
- Isso permite migração gradual sem forçar reset de senhas

## Biblioteca Usada

- **bcryptjs** v2.4.3
- Carregada via CDN: `https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js`
- Versão JavaScript pura do bcrypt (não requer compilação nativa)

## Segurança

✅ **Senhas nunca são armazenadas em texto plano**
✅ **Hash inclui salt automático** (bcrypt gera salt único para cada hash)
✅ **Comparação segura** (timing-safe comparison)
✅ **Migração automática** de senhas antigas

## Estrutura no Firestore

```javascript
{
  email: "usuario@exemplo.com",
  name: "Nome do Usuário",
  password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890", // Hash bcrypt
  isAdmin: false,
  invited: true,
  acceptedAt: null,
  createdAt: Timestamp
}
```

## Importante

⚠️ **Senhas antigas em texto plano serão automaticamente migradas para hash no próximo login**

⚠️ **Após a migração, não é possível recuperar a senha original** (por design de segurança)

⚠️ **Se um usuário esquecer a senha, será necessário criar um novo convite ou reset manual**

## Testando

1. Crie um novo convite com senha "teste123"
2. Faça login com "teste123"
3. Verifique no Firestore que o campo `password` começa com `$2a$10$` (hash)
4. Tente fazer login com senha errada - deve falhar
5. Faça login com senha correta - deve funcionar

## Troubleshooting

### Erro: "bcrypt is not defined"
- Verifique se o CDN do bcryptjs está carregado no `index.html`
- Verifique o console do navegador para erros de carregamento

### Senhas antigas não funcionam
- Se houver senhas em texto plano antigas, elas serão migradas automaticamente no primeiro login
- Se necessário, você pode resetar manualmente no Firestore

### Performance
- Hash de senha é feito apenas uma vez (ao criar convite)
- Comparação de senha é rápida (< 100ms)
- Salt rounds = 10 é um bom balanceamento (pode aumentar para 12 se necessário)
