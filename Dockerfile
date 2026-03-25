FROM node:22-alpine AS base
WORKDIR /app

ENV DATABASE_URL=postgresql://papermarket:papermarket@db:5432/papermarket?schema=public
ENV NEXTAUTH_URL=http://localhost:3000

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run db:generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "-p", "3000"]
