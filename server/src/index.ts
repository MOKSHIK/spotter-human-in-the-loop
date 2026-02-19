import express from "express";
import cors from "cors";
import { db } from "./db";
import path from "path";
import { signToken, requireAuth, requireRole } from "./auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "..", "data", "PNGImages")));

app.get("/", (req, res) => {
  res.send("Spotter running");
});


app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT id, email, role FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, row: any) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!row) return res.status(401).json({ message: "Invalid login" });

      const user = { id: row.id, email: row.email, role: row.role };
      const token = signToken(user);

      res.json({ user, token });
    }
  );
});

app.get("/images/next", requireAuth, requireRole("Annotator"), (req, res) => {
  db.get(
    `SELECT * FROM images WHERE state = 'Unlabeled' LIMIT 1`,
    [],
    (err, row: any) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!row) return res.status(404).json({ message: "No images left" });

      res.json({
        id: row.id,
        filename: row.filename,
        width: row.width,
        height: row.height,
        state: row.state,
        url: `http://localhost:5000/static/${row.filename}`
      });
    }
  );
});

app.post("/labels",requireAuth, requireRole("Annotator"), (req: any, res) => {
  const { imageId, boxes } = req.body;
  const userId = req.user.id;


  // boxes = [{ xmin, ymin, xmax, ymax }, ...]
  if (!imageId || !Array.isArray(boxes) || boxes.length === 0) {
    return res.status(400).json({ message: "imageId, boxes required" });
  }

  // basic validation
  for (const b of boxes) {
    if (
      typeof b.xmin !== "number" ||
      typeof b.ymin !== "number" ||
      typeof b.xmax !== "number" ||
      typeof b.ymax !== "number"
    ) {
      return res.status(400).json({ message: "Invalid box format" });
    }
    if (b.xmax <= b.xmin || b.ymax <= b.ymin) {
      return res.status(400).json({ message: "Box must have positive area" });
    }
  }

  db.serialize(() => {
    const stmt = db.prepare(
      `INSERT INTO labels (image_id, created_by, xmin, ymin, xmax, ymax)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (const b of boxes) {
      stmt.run([imageId, userId, b.xmin, b.ymin, b.xmax, b.ymax]);
    }

    stmt.finalize((err) => {
      if (err) return res.status(500).json({ message: "DB insert error" });

      // Mark image as Annotated
      db.run(
        `UPDATE images SET state = 'Annotated' WHERE id = ?`,
        [imageId],
        (err2) => {
          if (err2) return res.status(500).json({ message: "DB update error" });
          res.json({ message: "Labels saved, image marked Annotated" });
        }
      );
    });
  });
});

app.get("/images/:id/labels", requireAuth, (req, res) => {
  const imageId = Number(req.params.id);

  db.all(
    `SELECT id, xmin, ymin, xmax, ymax, created_by
     FROM labels
     WHERE image_id = ?
     ORDER BY id ASC`,
    [imageId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ labels: rows });
    }
  );
});
//Admin Endpoints
app.get("/admin/images", requireAuth, requireRole("Admin"), (req, res) => {
  const state = (req.query.state as string) || "Annotated";

  db.all(
    `SELECT id, filename, width, height, state FROM images WHERE state = ? ORDER BY id ASC LIMIT 50`,
    [state],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ images: rows.map((r: any) => ({ ...r, url: `http://localhost:5000/static/${r.filename}` })) });
    }
  );
});

app.delete("/admin/labels/:id", requireAuth, requireRole("Admin"), (req, res) => {
  const labelId = Number(req.params.id);

  db.run(`DELETE FROM labels WHERE id = ?`, [labelId], function (err) {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ deleted: this.changes });
  });
});

app.patch("/admin/images/:id/state", requireAuth, requireRole("Admin"), (req, res) => {
  const imageId = Number(req.params.id);
  const { state } = req.body;

  const allowed = ["Verified", "Rejected", "Annotated", "Unlabeled"];
  if (!allowed.includes(state)) return res.status(400).json({ message: "Invalid state" });

  db.run(`UPDATE images SET state = ? WHERE id = ?`, [state, imageId], function (err) {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ updated: this.changes });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});