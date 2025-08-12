# ~~~~~~~~~~~~~~~ STAGE 1: The Builder ~~~~~~~~~~~~~~~
# This stage installs all dependencies (dev and prod),
# builds the source code, and prunes dev dependencies.
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# --- Caching Dependencies ---
# Copy package.json and package-lock.json first.
# Docker will cache this layer and only re-run it if these files change.
COPY package*.json ./

# Install all dependencies, including devDependencies needed for the build
RUN npm install

# --- Building the Application ---
# Copy the rest of your application's source code, including the root schema.prisma
COPY . .

# Generate the Prisma client. This needs the schema.prisma file from your source.
# Using npx is better than installing Prisma globally.
RUN npx prisma generate

# Run the build script defined in your package.json (e.g., tsc or swc)
RUN npm run build

# --- Pruning Dependencies ---
# Remove devDependencies to leave only production dependencies in node_modules
RUN npm prune --production


# ~~~~~~~~~~~~~~~ STAGE 2: The Runner ~~~~~~~~~~~~~~~
# This is the final, small production image. It only contains
# what's needed to run the application.
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy the pruned node_modules, package files, and the built code
# from the 'builder' stage.
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist


# Expose the port your application will run on
EXPOSE 8080

# The command to start the application
CMD ["node", "dist/index.js"]
