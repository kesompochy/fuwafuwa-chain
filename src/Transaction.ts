export default class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  constructor(fromAddress: string, toAddress: string, amount: number) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }
  isValid(): boolean {
    if (!this.fromAddress) return false;
    if (!this.toAddress) return false;
    return true;
  }
}
