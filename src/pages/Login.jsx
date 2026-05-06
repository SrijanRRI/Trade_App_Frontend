import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isSetup, setIsSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "Super Admin",
    email: "admin@example.com",
    password: "123456"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = isSetup
        ? form
        : {
            email: form.email,
            password: form.password
          };

      await login(payload, isSetup);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      <Card className="w-full max-w-md border-white/10 bg-white/95 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-600">Trade_App</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Purchase Sales Integration
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Login to manage PO, inventory, sales and dummy Tally sync.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isSetup ? (
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          ) : null}

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </span>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isSetup ? "Create Super Admin" : "Login"}
          </Button>
        </form>

        <button
          onClick={() => setIsSetup((prev) => !prev)}
          className="mt-4 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {isSetup ? "Already created? Login" : "First time setup? Create Super Admin"}
        </button>
      </Card>
    </div>
  );
}