import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as t from "io-ts";
import * as sinon from "sinon";
import { service } from "../src/service";

chai.should();
chai.use(chaiAsPromised);

describe("service", () => {
  const desc = {
    type: t.any,
    init: sinon.stub().resolvesArg(0),
    authorized: sinon.stub().resolvesArg(1),
    forbidden: sinon.stub().resolvesArg(1),
    response: sinon.stub().resolvesArg(0)
  };

  const msg = {
    headers: {
      test: "header"
    },
    body: {}
  };

  afterEach(() => {
    desc.init.resetHistory();
    desc.authorized.resetHistory();
    desc.forbidden.resetHistory();
    desc.response.resetHistory();
  });

  describe("init", () => {
    beforeEach(() => service(desc, { test: "test" })(msg));

    it("should be called", () => desc.init.called.should.equal(true));

    it("should be called with options", () =>
      desc.init.lastCall.args[0].should.deep.equal({ test: "test" }));
  });

  describe("authorized", () => {
    beforeEach(() => service(desc)(msg));

    it("should be called", () => desc.authorized.called.should.equal(true));

    it("should be called with request headers", () =>
      desc.authorized.lastCall.args[0].should.deep.equal({ test: "header" }));

    it("should be called with context", () =>
      desc.authorized.lastCall.args[1].should.deep.equal({}));
  });

  describe("forbidden", () => {
    beforeEach(() => service(desc)(msg));

    it("should be called", () => desc.forbidden.called.should.equal(true));

    it("should be called with request headers", () =>
      desc.forbidden.lastCall.args[0].should.deep.equal({ test: "header" }));

    it("should be called with context", () =>
      desc.forbidden.lastCall.args[1].should.deep.equal({}));
  });

  describe("response", () => {
    beforeEach(() => service(desc)(msg));

    it("should be called", () => desc.response.called.should.equal(true));

    it("should be called with context", () =>
      desc.response.lastCall.args[0].should.deep.equal({}));

    it("should resolve with response", () =>
      service(desc, "test")(msg).should.eventually.equal("test"));
  });

  describe("error handling", () => {
    describe("init rejects with error", () => {
      it("should be rejected", () =>
        service({ ...desc, init: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("authorized rejects with error", () => {
      it("should be rejected", () =>
        service({ ...desc, authorized: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("forbidden rejects with error", () => {
      it("should be rejected", () =>
        service({ ...desc, forbidden: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("response rejects with error", () => {
      it("should be rejected", () =>
        service({ ...desc, response: sinon.stub().rejects() })(
          msg
        ).should.be.rejectedWith(Error));
    });

    describe("with invalid response data", () => {
      it("should be rejected", () =>
        service({ ...desc, type: t.number }, "test")(
          msg
        ).should.be.rejectedWith(Error));
    });
  });
});
