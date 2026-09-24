# Habit Tracker — Backend

API REST para el sistema de gestión de hábitos y metas personales **Habit Tracker**, desarrollada con NestJS y MongoDB.

## Tecnologías utilizadas

- **NestJS** (Node.js + TypeScript) — framework del backend
- **MongoDB** con **Mongoose** — base de datos y modelado de esquemas
- **Passport + JWT** — autenticación
- **bcrypt** — hash de contraseñas con sal
- **class-validator / class-transformer** — validación de DTOs
- **pnpm** — gestor de paquetes

## Arquitectura

La API está organizada en módulos, siguiendo la arquitectura modular de NestJS:

```
src/
├── auth/          Registro, login, JWT, guards
├── users/          Perfil del usuario autenticado
├── habits/         CRUD de hábitos
├── records/         Seguimiento diario/semanal de cumplimiento y rachas
├── statistics/      Agregación de estadísticas y datos para gráficas
├── common/           Utilidades compartidas (fecha en zona horaria de
│                    Honduras, cálculo de rachas y % de cumplimiento)
├── app.module.ts
└── main.ts
```

Cada módulo tiene su propio `controller` (rutas), `service` (lógica de negocio) y, cuando aplica, sus `dto` (validación) y `schemas` (modelos de Mongoose).

### Modelo de datos

- **User**: nombre, correo, contraseña (hasheada)
- **Habit**: nombre, descripción, categoría, frecuencia (diario/semanal/personalizada), días personalizados, prioridad, fecha de inicio/fin, activo, usuario (relación)
- **HabitRecord**: hábito (relación), usuario (relación), fecha, completado

### Autenticación

JWT stateless. El token se firma al hacer login/registro y se valida en cada petición protegida mediante `JwtAuthGuard`. Las contraseñas se guardan con `bcrypt` (sal generada explícitamente antes de hashear).

## Instalación y ejecución local

### 1. Requisitos previos

- Node.js 18+
- pnpm
- MongoDB corriendo (local, Docker, o Atlas)

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Creá un archivo `.env` en la raíz del proyecto con:

```
PORT=3001
MONGODB_URI=mongodb://usuario:contraseña@localhost:27017/habitsdb?authSource=admin
JWT_SECRET=una_cadena_secreta_larga_y_dificil_de_adivinar
JWT_EXPIRES_IN=7d
```

Ajustá `MONGODB_URI` según cómo tengas tu MongoDB (con o sin autenticación).

### 4. Levantar el servidor

```bash
pnpm run start:dev
```

El backend queda disponible en `http://localhost:3001`.

## Endpoints principales

| Módulo     | Endpoint               | Método         | Descripción                        |
| ---------- | ---------------------- | -------------- | ---------------------------------- |
| Auth       | `/auth/register`       | POST           | Registrar un nuevo usuario         |
| Auth       | `/auth/login`          | POST           | Iniciar sesión y obtener JWT       |
| Users      | `/users/me`            | GET            | Perfil del usuario autenticado     |
| Habits     | `/habits`              | GET / POST     | Listar / crear hábitos             |
| Habits     | `/habits/:id`          | PATCH / DELETE | Editar / eliminar un hábito        |
| Records    | `/habits/:id/complete` | POST / DELETE  | Marcar / desmarcar cumplimiento    |
| Records    | `/habits/:id/history`  | GET            | Historial de un hábito             |
| Records    | `/habits/:id/streak`   | GET            | Racha actual y mejor racha         |
| Statistics | `/statistics`          | GET            | Estadísticas agregadas del usuario |

Todos los endpoints (excepto `auth/register` y `auth/login`) requieren el header `Authorization: Bearer <token>`.

## Notas de diseño

- Todas las fechas relevantes para "qué día es hoy" se calculan explícitamente en la zona horaria de Honduras (`America/Tegucigalpa`), sin depender de la configuración del servidor.
- Los hábitos semanales se consideran "cumplidos" para toda la semana (lunes a domingo) una vez marcados un solo día; el reinicio ocurre el lunes.
- Al eliminar un hábito, sus registros de cumplimiento asociados se eliminan en cascada.
