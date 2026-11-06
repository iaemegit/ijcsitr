declare namespace Express {
  interface Request {
    adminUser?: { user_id: number; user_name: string; user_password: string };
    adminSession?: {
      userId: number;
      version: string;
      csrf: string;
      expires: number;
    };
  }
}
