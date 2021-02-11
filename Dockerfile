FROM node:lts-alpine

WORKDIR /app

COPY package.json /app/
RUN yarn

COPY *.js /app/
COPY middlewares/ /app/middlewares/
COPY routes/ /app/routes/
COPY utils/ /app/utils/

EXPOSE 8000

CMD ["npm", "start"]