function extensionFor(name) {
  if (name === "Phantom") {
    return window.phantom?.solana ?? window.solana;
  }
  if (name === "Solflare") {
    return window.solflare;
  }
  return null;
}

export class WalletSession {
  constructor() {
    this.providerName = null;
    this.provider = null;
    this.publicKey = null;
    this.balance = 1;
    this.mode = "simulated";
  }

  availableWallets() {
    return ["Phantom", "Solflare"].filter((name) => extensionFor(name));
  }

  async connect(preferred = "Phantom") {
    const name = this.availableWallets().includes(preferred)
      ? preferred
      : this.availableWallets()[0];
    const provider = name ? extensionFor(name) : null;
    if (!provider) {
      this.mode = "simulated";
      this.providerName = null;
      this.provider = null;
      this.publicKey = "Simulated player";
      return this.getState();
    }
    const response = await provider.connect();
    this.mode = "extension";
    this.providerName = name;
    this.provider = provider;
    this.publicKey = response.publicKey?.toString() ?? provider.publicKey?.toString() ?? null;
    return this.getState();
  }

  spend(amount) {
    if (amount > this.balance) {
      return false;
    }
    this.balance -= amount;
    return true;
  }

  getState() {
    return {
      mode: this.mode,
      providerName: this.providerName,
      publicKey: this.publicKey,
      balance: this.balance,
    };
  }
}
