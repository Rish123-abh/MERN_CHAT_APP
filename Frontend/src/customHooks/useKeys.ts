import { useEffect, useState } from "react";
import sodium from "libsodium-wrappers";

const uint8ArrayToBase64 = (arr: Uint8Array) =>
  btoa(String.fromCharCode(...arr));

const base64ToUint8Array = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const useKeys = () => {
  const [publicKey, setPublicKey] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const loadOrGenerateKeys = async () => {
      await sodium.ready;

      // Check if keys exist in localStorage
      const storedPublicKey = localStorage.getItem("publicKey");
      const storedPrivateKey = localStorage.getItem("privateKey");

      if (storedPublicKey && storedPrivateKey) {
        setPublicKey(storedPublicKey);
        setPrivateKey(base64ToUint8Array(storedPrivateKey));
      } else {
        // Generate new key pair
        const keyPair = sodium.crypto_box_keypair();
        const pubBase64 = sodium.to_base64(keyPair.publicKey);
        const privBase64 = uint8ArrayToBase64(keyPair.privateKey);

        // Save to localStorage
        localStorage.setItem("publicKey", pubBase64);
        localStorage.setItem("privateKey", privBase64);

        setPublicKey(pubBase64);
        setPrivateKey(keyPair.privateKey);

        // TODO: Send publicKey to backend when user registers
      }
    };

    loadOrGenerateKeys();
  }, []);

  return { publicKey, privateKey };
};

export const encryptMessage = async (message: string, receiverPublicKeyBase64: string, senderPrivateKey: Uint8Array) => {
  await sodium.ready;
  const receiverPublicKey = sodium.from_base64(receiverPublicKeyBase64);
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  const ciphertext = sodium.crypto_box_easy(
    message,
    nonce,
    receiverPublicKey,
    senderPrivateKey
  );

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
};
export const decryptMessage = async (ciphertextBase64: string, nonceBase64: string, senderPublicKeyBase64: string, receiverPrivateKey: Uint8Array) => {
  await sodium.ready;
  const ciphertext = sodium.from_base64(ciphertextBase64);
  const nonce = sodium.from_base64(nonceBase64);
  const senderPublicKey = sodium.from_base64(senderPublicKeyBase64);

  const decrypted = sodium.crypto_box_open_easy(ciphertext, nonce, senderPublicKey, receiverPrivateKey);
  return sodium.to_string(decrypted);
};

