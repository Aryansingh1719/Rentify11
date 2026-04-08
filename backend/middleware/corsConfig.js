const allowedOrigins = [
  "http://localhost:3000",
  "https://rentify11-aryan-s-projects-323c3d5d.vercel.app",
  "https://rentify11.vercel.app",
];

export const corsOptions = {
  origin: function (origin, callback) {
    console.log("Origin:", origin); // debug

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};