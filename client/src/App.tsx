import { useEffect, useRef, useState } from "react";
import { api, setAuthToken } from "./api";

type User = { id: number; email: string; role: "Annotator" | "Admin" };
type ImageItem = { id: number; filename: string; width: number; height: number; state: string; url: string };
type AdminImage = { id: number; filename: string; width: number; height: number; state: string; url: string };
type Label = { id: number; xmin: number; ymin: number; xmax: number; ymax: number; created_by: number };

type Box = { xmin: number; ymin: number; xmax: number; ymax: number };

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const [image, setImage] = useState<ImageItem | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [msg, setMsg] = useState("");

  const [adminStateFilter, setAdminStateFilter] = useState<"Annotated" | "Verified" | "Rejected">("Annotated");
  const [adminImages, setAdminImages] = useState<AdminImage[]>([]);
  const [selectedAdminImage, setSelectedAdminImage] = useState<AdminImage | null>(null);
  const [adminLabels, setAdminLabels] = useState<Label[]>([]);

  // drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const adminImgRef = useRef<HTMLImageElement | null>(null);
  const adminCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<Box | null>(null);

  async function login() {
    setMsg("");
    const res = await api.post("/login", { email, password });
    setUser(res.data.user);
    setAuthToken(res.data.token);
  }

  async function loadNext() {
    setMsg("");
    setBoxes([]);
    setCurrent(null);
    const res = await api.get("/images/next");
    setImage(res.data);
  }

  async function loadAdminImages() {
  const res = await api.get("/admin/images", { params: { state: adminStateFilter } });
  setAdminImages(res.data.images);
  setSelectedAdminImage(null);
  setAdminLabels([]);
}

  async function selectAdminImage(img: AdminImage) {
    setSelectedAdminImage(img);
    const res = await api.get(`/images/${img.id}/labels`);
    setAdminLabels(res.data.labels);
  }

  async function deleteLabel(labelId: number) {
    await api.delete(`/admin/labels/${labelId}`);
    if (selectedAdminImage) {
      const res = await api.get(`/images/${selectedAdminImage.id}/labels`);
      setAdminLabels(res.data.labels);
      console.log("cameee heerreeeeeeeeeeeeeeeeee")
    }
  }

  async function setImageState(state: "Verified" | "Rejected") {
    if (!selectedAdminImage) return;
    await api.patch(`/admin/images/${selectedAdminImage.id}/state`, { state });
    await loadAdminImages();
  }

  // redraw canvas whenever boxes/current/image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !image) return;

    // match canvas to displayed image size
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw saved boxes
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    for (const b of boxes) {
      ctx.strokeRect(b.xmin, b.ymin, b.xmax - b.xmin, b.ymax - b.ymin);
    }

    // draw current box being drawn
    if (current) {
      ctx.strokeStyle = "lime";
      ctx.strokeRect(current.xmin, current.ymin, current.xmax - current.xmin, current.ymax - current.ymin);
    }
  }, [boxes, current, image]);

  useEffect(() => {
  const img = adminImgRef.current;
  const canvas = adminCanvasRef.current;
  if (!img || !canvas || !selectedAdminImage) return;

  // set canvas size to displayed image size
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // original -> displayed scale
  const scaleX = img.clientWidth / selectedAdminImage.width;
  const scaleY = img.clientHeight / selectedAdminImage.height;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "orange";

  for (const l of adminLabels) {
    const x = l.xmin * scaleX;
    const y = l.ymin * scaleY;
    const w = (l.xmax - l.xmin) * scaleX;
    const h = (l.ymax - l.ymin) * scaleY;

    ctx.strokeRect(x, y, w, h);

    // optional label id text
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "orange";
    ctx.fillText(`#${l.id}`, x + 4, y + 14);
  }
}, [selectedAdminImage, adminLabels]);

  function getMousePos(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (!image) return;
    setIsDrawing(true);
    const p = getMousePos(e);
    setStart(p);
    setCurrent({ xmin: p.x, ymin: p.y, xmax: p.x, ymax: p.y });
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
    if (!isDrawing || !start) return;
    const p = getMousePos(e);

    const xmin = Math.min(start.x, p.x);
    const ymin = Math.min(start.y, p.y);
    const xmax = Math.max(start.x, p.x);
    const ymax = Math.max(start.y, p.y);

    setCurrent({ xmin, ymin, xmax, ymax });
  }

  function onMouseUp() {
    if (!isDrawing || !current) {
      setIsDrawing(false);
      setStart(null);
      return;
    }

    // prevent tiny boxes
    if (current.xmax - current.xmin < 5 || current.ymax - current.ymin < 5) {
      setCurrent(null);
      setIsDrawing(false);
      setStart(null);
      return;
    }

    setBoxes((prev) => [...prev, current]);
    setCurrent(null);
    setIsDrawing(false);
    setStart(null);
  }

  function undo() {
    setBoxes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setBoxes([]);
    setCurrent(null);
  }

  async function submit() {
    if (!user || !image) return;
    if (boxes.length === 0) {
      setMsg("Draw at least one box before submitting.");
      return;
    }

    // Convert displayed coords → original image coords
    const displayedW = imgRef.current?.clientWidth ?? 1;
    const displayedH = imgRef.current?.clientHeight ?? 1;

    const scaleX = image.width / displayedW;
    const scaleY = image.height / displayedH;

    const transformed = boxes.map((b) => ({
      xmin: Math.round(b.xmin * scaleX),
      ymin: Math.round(b.ymin * scaleY),
      xmax: Math.round(b.xmax * scaleX),
      ymax: Math.round(b.ymax * scaleY),
    }));

    await api.post("/labels", { imageId: image.id, boxes: transformed });

    setMsg("Submitted!");
    await loadNext();
  }

  return (
    <div className="app-container" style={{ fontFamily: "sans-serif", padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2>The Spotter (Annotator)</h2>

      {!user ? (
        <div className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            Logged in as <span style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  backgroundColor: user.role === "Admin" ? "#fef3c7" : "#dbeafe",
                  color: "#333",
                  fontSize: 12,
                  marginLeft: 6
                }}
              >
                {user.role}
              </span>
          </div>
        {user.role === "Annotator" && (
          <button onClick={loadNext}>Get Next Image</button>
          )}
        </div>
      )}
      {user?.role === "Admin" && (
        <div className="card" style={{marginTop: 24}}>
          <h3>Admin Dashboard</h3>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={adminStateFilter} onChange={(e) => setAdminStateFilter(e.target.value as any)}>
              <option value="Annotated">Annotated</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button onClick={loadAdminImages}>Load</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, marginTop: 16 }}>
            <div style={{ width: 320 }}>
              <b>Images</b>
              <div style={{ border: "1px solid #ccc", padding: 8, maxHeight: 400, overflow: "auto" }}>
                {adminImages.map((img) => (
                  <div key={img.id} style={{ padding: 6, cursor: "pointer" }} onClick={() => selectAdminImage(img)}>
                    #{img.id} — {img.filename} <span style={{ opacity: 0.6 }}>({img.state})</span>
                  </div>
                ))}
                {adminImages.length === 0 && <div style={{ opacity: 0.7 }}>No images loaded</div>}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <b>Preview</b>
              {!selectedAdminImage ? (
                <div style={{ opacity: 0.7, marginTop: 8 }}>Select an image to review labels</div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <b>{selectedAdminImage.filename}</b> — labels: {adminLabels.length}
                  </div>

                  <div style={{ position: "relative", display: "inline-block", border: "1px solid #ccc" }}>
                    <img
                      ref={adminImgRef}
                      src={selectedAdminImage.url}
                      alt="admin"
                      style={{ maxWidth: "800px", width: "100%", height: "auto", display: "block" }}
                      onLoad={() => {
                        // trigger redraw after image loads
                        setAdminLabels((prev) => [...prev]);
                      }}
                    />
                    <canvas
                      ref={adminCanvasRef}
                      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                    />
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <button onClick={() => setImageState("Verified")}>Mark Verified</button>
                    <button onClick={() => setImageState("Rejected")}>Mark Rejected</button>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <b>Labels</b>
                    <div style={{ border: "1px solid #ccc", padding: 8 }}>
                      {adminLabels.map((l) => (
                        <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: 6 }}>
                          <span>
                            #{l.id} [{l.xmin},{l.ymin}] → [{l.xmax},{l.ymax}]
                          </span>
                          <button onClick={() => deleteLabel(l.id)}>Delete</button>
                        </div>
                      ))}
                      {adminLabels.length === 0 && <div style={{ opacity: 0.7 }}>No labels</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msg && <p>{msg}</p>}

      {user?.role === "Annotator" && image &&(
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <b>{image.filename}</b> (original: {image.width}×{image.height}) | boxes: {boxes.length}
          </div>

          <div style={{
                position: "relative",
                display: "inline-block",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#fff"
              }}>
            <img
              ref={imgRef}
              src={image.url}
              alt="to-annotate"
              style={{ maxWidth: "800px", width: "100%", height: "auto", display: "block" }}
              onLoad={() => {
                // trigger redraw after image loads
                setBoxes((b) => [...b]);
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", left: 0, top: 0, cursor: "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={undo} disabled={boxes.length === 0}>
              Undo
            </button>
            <button onClick={clearAll} disabled={boxes.length === 0}>
              Clear
            </button>
            <button onClick={submit} disabled={!user || !image || boxes.length === 0}>Submit</button>
          </div>

          <p style={{ fontSize: 12, opacity: 0.75 }}>
            Green box = currently drawing. Red boxes = saved in current session.
          </p>
        </div>
      )}
    </div>
  );
}