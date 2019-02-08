import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as t from "io-ts";
import * as sinon from "sinon";
import { resource } from "../src/resource";

chai.should();
chai.use(chaiAsPromised);

describe("resource", () => {
  const desc = {
    type: [t.any, t.any] as [t.Type<any>, t.Type<any>],
    init: sinon.stub().resolvesArg(0),
    authorized: sinon.stub().resolvesArg(1),
    exists: sinon.stub().resolvesArg(1),
    forbidden: sinon.stub().resolvesArg(1),
    update: sinon.stub().resolvesArg(1),
    response: sinon.stub().resolvesArg(0)
  };

  const msg = {
    headers: {
      test: "header"
    },
    body: { test: "test" }
  };

  afterEach(() => {
    desc.init.resetHistory();
    desc.authorized.resetHistory();
    desc.exists.resetHistory();
    desc.forbidden.resetHistory();
    desc.update.resetHistory();
    desc.response.resetHistory();
  });

  describe("init", () => {
    beforeEach(() => resource(desc, "test")(msg));

    it("should be called", () => desc.init.called.should.equal(true));

    it("should be called with options", () =>
      desc.init.lastCall.args[0].should.deep.equal("test"));
  });

  describe("authorized", () => {
    beforeEach(() => resource(desc)(msg));

    it("should be called", () => desc.authorized.called.should.equal(true));

    it("should be called with request headers", () =>
      desc.authorized.lastCall.args[0].should.deep.equal({ test: "header" }));

    it("should be called with context", () =>
      desc.authorized.lastCall.args[1].should.deep.equal({}));
  });

  describe("exists", () => {
    beforeEach(() => resource(desc)(msg));

    it("should be called", () => desc.exists.called.should.equal(true));

    it("should be called with request headers", () =>
      desc.exists.lastCall.args[0].should.deep.equal({ test: "header" }));

    it("should be called with context", () =>
      desc.exists.lastCall.args[1].should.deep.equal({}));
  });

  describe("forbidden", () => {
    beforeEach(() => resource(desc)(msg));

    it("should be called", () => desc.forbidden.called.should.equal(true));

    it("should be called with request headers", () =>
      desc.forbidden.lastCall.args[0].should.deep.equal({ test: "header" }));

    it("should be called with context", () =>
      desc.forbidden.lastCall.args[1].should.deep.equal({}));
  });

  describe("update", () => {
    beforeEach(() => resource(desc)(msg));

    it("should be called", () => desc.update.called.should.equal(true));

    it("should be called with request body", () =>
      desc.update.lastCall.args[0].should.deep.equal({ test: "test" }));

    it("should be called with context", () =>
      desc.update.lastCall.args[1].should.deep.equal({}));
  });

  describe("response", () => {
    beforeEach(() => resource(desc)(msg));

    it("should be called", () => desc.response.called.should.equal(true));

    it("should be called with context", () =>
      desc.response.lastCall.args[0].should.deep.equal({}));

    describe("with valid response data", () => {
      it("should resolve with response", () =>
        resource(desc, 42)(msg).should.eventually.equal(42));
    });
  });

  describe("error handling", () => {
    describe("init rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, init: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("authorized rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, authorized: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("exists rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, exists: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("forbidden rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, forbidden: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("update rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, update: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("response rejects with error", () => {
      it("should be rejected", () =>
        resource({ ...desc, response: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("with invalid request data", () => {
      it("should be rejected", () =>
        resource({ ...desc, type: [t.number, t.any] })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("with invalid response data", () => {
      it("should be rejected", () =>
        resource({ ...desc, type: [t.any, t.number] }, "test")(
          msg
        ).should.be.rejectedWith(Error));
    });
  });
});
