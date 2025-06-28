import { useState } from "react";

function ProfileSettings() {
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, avatarUrl: avatar, theme }),
      });

      if (res.ok) {
        setMessage("Profile updated successfully!");
      } else {
        setMessage("Error updating profile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Edit Profile</h2>

      <label className="block">
        <span className="text-gray-700">Bio</span>
        <textarea
          className="mt-1 block w-full border rounded-md p-2"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
        />
      </label>

      <label className="block">
        <span className="text-gray-700">Avatar URL</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded-md p-2"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
        />
      </label>

      <label className="block">
        <span className="text-gray-700">Theme</span>
        <select
          className="mt-1 block w-full border rounded-md p-2"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <button
        onClick={handleSubmit}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save"}
      </button>

      {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
    </div>
  );
}

export default ProfileSettings;
