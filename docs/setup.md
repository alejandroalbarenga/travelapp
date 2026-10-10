# Setup: cuentas, servicios y variables de entorno

Checklist de lo que Ale tiene que crear. Claude no crea cuentas ni recursos en la nube: cuando esté todo, pasale los valores de las variables de entorno (las públicas) y avisá.

Todo es gratis. Ninguno pide tarjeta.

---

## 1. GitHub
- [x] Repo `alejandroalbarenga/travelapp` creado.

## 2. Supabase (base de datos, login y archivos)

1. [x] Entrá a <https://supabase.com> → **Start your project** → registrate con tu cuenta de GitHub.
2. [x] **New project**:
   - Organización: la personal que te crea por defecto (plan Free).
   - Nombre: `travelapp`.
   - Database password: generá una y **guardala en tu gestor de contraseñas** (no la vas a necesitar seguido, pero no se puede volver a ver).
   - Región: **Central EU (Frankfurt)** o **West EU (Ireland)**, cerca de donde vas a usar la app.
3. [x] Esperá a que termine de crearse (un par de minutos).
4. [x] En **Project Settings → API** (o **API Keys**), anotá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (o *anon public* en la vista vieja) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - La **secret key** (o *service_role*) **no** la copies a ningún lado por ahora. Da acceso total a la base.
5. [ ] En **Authentication → Sign In / Providers → Email**: dejá Email activado.
6. [ ] En **Authentication → Email Templates → Magic Link**: cambiá el cuerpo para que muestre el código en vez del link. Por ejemplo:
   ```html
   <h2>Tu código para entrar</h2>
   <p>Escribí este código en la app: <strong>{{ .Token }}</strong></p>
   <p>Vence en una hora.</p>
   ```
   Hacé lo mismo en la plantilla **Confirm signup**.
7. [ ] El SMTP propio (paso 3) se configura en **Authentication → Emails → SMTP Settings**.
8. [ ] Cuando exista la URL de Vercel (paso 4), en **Authentication → URL Configuration** poné esa URL en **Site URL**.

> Nota: un proyecto Free se pausa después de 7 días sin uso. Se reactiva desde el panel con un clic; durante el viaje no va a pasar.

## 3. Mails de login (SMTP)

El mail que trae Supabase solo manda a los miembros del equipo del proyecto y tiene un límite muy bajo, así que tus amigos no recibirían el código. Elegí una opción:

**Opción A · Gmail (recomendada si no tenés dominio propio)**
1. [ ] Activá la verificación en dos pasos en tu cuenta de Google, si no la tenés.
2. [ ] Entrá a <https://myaccount.google.com/apppasswords> → creá una contraseña de aplicación llamada `travelapp`.
3. [ ] En Supabase → SMTP Settings → **Enable custom SMTP**:
   - Host: `smtp.gmail.com` · Port: `465`
   - Username: tu Gmail · Password: la contraseña de aplicación (16 letras, sin espacios)
   - Sender email: tu Gmail · Sender name: `Vamo`
4. [ ] En **Authentication → Rate Limits**, subí el límite de mails por hora (por ejemplo a 30).

**Opción B · Resend (si tenés un dominio propio)**
1. [ ] Registrate en <https://resend.com>, verificá tu dominio (te pide agregar registros DNS) y creá una API key.
2. [ ] En Supabase → SMTP Settings: host `smtp.resend.com`, port `465`, username `resend`, password la API key, sender `viajes@tudominio.com`.

## 4. Vercel (hosting)

1. [x] Entrá a <https://vercel.com> → **Sign Up** → plan **Hobby** → con tu cuenta de GitHub.
2. [x] **No importes el repo todavía**: hace falta que exista el proyecto de Next.js (Etapa 1). Cuando esté, en **Add New → Project** elegí `travelapp` y dale permiso a Vercel sobre ese repo.
3. [x] Antes del primer deploy, en **Environment Variables** cargá las dos variables de abajo para Production, Preview y Development.
4. [x] Anotá la URL que te da (`travelapp-two-cyan.vercel.app`) y ponela en Supabase (paso 2.8).

## 5. En tu compu (solo si vas a correr la app localmente)
- [ ] Node.js LTS desde <https://nodejs.org> (trae npm).
- [ ] Archivo `.env.local` en la raíz del repo con las variables de abajo. Nunca se commitea.

---

## Variables de entorno

| Variable | De dónde sale | ¿Es secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | No (va al navegador) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Publishable / anon key | No (va al navegador; la protege Row Level Security) |

Si más adelante hace falta algún secreto del lado del servidor (por ejemplo la secret key de Supabase), se agrega acá y solo en Vercel, nunca con prefijo `NEXT_PUBLIC_`.

## Qué pasarle a Claude cuando termines
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Qué opción de SMTP configuraste.
- La URL de Vercel, cuando la tengas.
- **Nunca** la contraseña de la base, la secret key ni la contraseña de Gmail.
