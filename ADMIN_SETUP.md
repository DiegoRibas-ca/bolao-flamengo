# 👑 Guia de Configuração do Administrador

## Como Criar o Usuário Administrador

### Opção 1: Criar Manualmente no Firestore (Recomendado)

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **bolao-do-mengao**
3. Vá em **Firestore Database**
4. Clique em **Iniciar coleção** (se ainda não tiver criado)
5. Nome da coleção: `users`
6. Adicione um documento com:
   - **ID do documento**: `admin` (ou qualquer ID único, ex: `seu_email_com`)
   - **Campos**:
     ```
     email: "seu-email@exemplo.com"
     name: "Seu Nome"
     password: "sua-senha-aqui"
     isAdmin: true
     invited: false
     createdAt: [Timestamp - use o botão para adicionar data atual]
     ```

### Opção 2: Usar o Painel Admin (Após criar primeiro admin)

Se você já tem um admin criado, pode criar outros admins pelo próprio painel:
1. Faça login como admin
2. Vá em **Admin** > **Convites**
3. Preencha os dados e marque como admin (será necessário ajustar o código para isso)

## Como Acessar como Administrador

1. Abra o aplicativo no navegador
2. Clique em **Entrar** (canto superior direito)
3. Digite:
   - **Email**: O email que você configurou no Firestore
   - **Senha**: A senha que você configurou
4. Clique em **Entrar**

Após o login, você verá:
- Seu nome no canto superior direito
- Botão **Admin** na navegação (se `isAdmin: true`)

## Funcionalidades do Painel Admin

### 1. Configurações (⚙️)

Aqui você controla **TODOS** os pesos de pontuação:

#### Configurações Gerais
- **Máximo de gols por palpite**: Limite máximo que um participante pode colocar em um palpite

#### Pesos de Pontuação Base
Estes são os pesos base que serão **multiplicados** pelo peso do campeonato:

- **Placar Exato**: Pontos por acertar o placar completo (ex: 2x1)
- **Resultado**: Pontos por acertar vitória, empate ou derrota do Flamengo
- **Gols de um Time**: Pontos por acertar número de gols do Flamengo OU do adversário
- **Marcador (por gol)**: Pontos por cada marcador de gol acertado

#### Pesos por Campeonato
Multiplicador aplicado aos pesos base acima. Por exemplo:
- Se "Placar Exato" = 10 e "Brasileirão" = 3
- Pontos finais = 10 × 3 = 30 pontos

**IMPORTANTE**: Os pesos dos campeonatos são salvos na configuração, **NÃO** no banco de dados dos campeonatos.

### 2. Jogos (⚽)

- **Adicionar Jogo**: Criar novos jogos do calendário 2026
- **Editar Jogo**: Modificar jogos existentes
- **Definir Placar**: Registrar o resultado final do jogo
- **Alterar Status**: Mudar entre "Próximo", "Ao vivo", "Finalizado"
- **Registrar Marcadores**: Adicionar quais jogadores marcaram gols (para cálculo de pontos)

### 3. Elenco (👥)

- **Adicionar Jogador**: Incluir jogadores do Flamengo no elenco
- **Remover Jogador**: Excluir jogadores do elenco
- Os jogadores aparecem no dropdown quando participantes fazem palpites

### 4. Convites (✉️)

- **Enviar Convite**: Convidar novos participantes
- Preencha:
  - Email do participante
  - Nome do participante
  - Senha temporária (o participante pode alterar depois)
- O participante receberá as credenciais para fazer login

## Estrutura de Dados do Admin

No Firestore, o documento do admin deve ter:

```javascript
{
  email: "admin@exemplo.com",
  name: "Nome do Admin",
  password: "senha123",  // ⚠️ Em produção, use hash!
  isAdmin: true,        // ⚠️ IMPORTANTE: deve ser true
  invited: false,
  createdAt: Timestamp
}
```

## Segurança

⚠️ **IMPORTANTE**: 
- As senhas estão sendo armazenadas em texto plano (não seguro para produção)
- Para produção, implemente hash de senhas (bcrypt, etc.)
- Ou use Firebase Authentication (recomendado)

## Exemplo de Criação Rápida

1. Firebase Console > Firestore Database
2. Coleção: `users`
3. Adicionar documento:
   - ID: `admin`
   - Campos:
     - `email` (string): `admin@flamengo.com`
     - `name` (string): `Administrador`
     - `password` (string): `admin123`
     - `isAdmin` (boolean): `true`
     - `invited` (boolean): `false`
     - `createdAt` (timestamp): Data atual

4. Salvar
5. Fazer login no app com essas credenciais

## Dúvidas?

- Verifique se `isAdmin: true` está configurado
- Verifique se o email e senha estão corretos
- Verifique o console do navegador para erros
- Verifique as regras de segurança do Firestore
