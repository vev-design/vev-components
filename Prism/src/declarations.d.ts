declare module "*.scss";
declare module "*.css";

declare module "*?worker" {
  class VevWorker extends Worker {
    constructor();
  }

  export default VevWorker;
}
