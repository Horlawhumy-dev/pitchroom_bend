# Stage 1: Build the application
FROM public.ecr.aws/docker/library/node:20-alpine AS build

RUN apk update && apk add --no-cache poppler-utils

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock to the working directory
COPY package.json  ./

# Install dependencies using yarn
RUN npm install

# Copy the rest of the application source code to the working directory
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
#FROM public.ecr.aws/docker/library/node:20-alpine

# Set the working directory inside the container
#WORKDIR /app

# Copy the built application from the build stage
#COPY --from=build /app/dist ./dist

# Copy the node_modules from the build stage
# COPY --from=build /app/node_modules ./node_modules

# Copy package.json and yarn.lock from the build stage
# COPY --from=build /app/package.json  ./

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "run", "start"]
