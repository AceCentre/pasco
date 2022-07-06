
export default class BaseModule {
  getName () {
    throw new Error('Not implemented')
  }
  async generate () {
    throw new Error('Not implemented')
  }
}
