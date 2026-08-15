from pathlib import Path
import unittest


ROOT = Path(__file__).parent


class ClientSecretRegressionTests(unittest.TestCase):
    def test_frontend_does_not_embed_a_google_api_key_or_firebase_initialization(self):
        source = (ROOT / "script.js").read_text(encoding="utf-8")

        self.assertNotIn("AIza", source)
        self.assertNotIn("firebase.initializeApp", source)
        self.assertNotIn("apiKey", source)

    def test_index_does_not_load_firebase_sdks(self):
        source = (ROOT / "index.html").read_text(encoding="utf-8")

        self.assertNotIn("firebasejs", source)


if __name__ == "__main__":
    unittest.main()
