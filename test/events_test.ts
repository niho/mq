import * as chai from "chai";
import * as t from "io-ts";
import * as sinon from "sinon";
import { events } from "../src/events";

chai.should();

describe("events", () => {
  const msg = {
    headers: {},
    body: {}
  };

  describe("single callback style", () => {
    describe("incoming event", () => {
      const handler = events({
        type: t.any,
        init: () => ({}),
        event: sinon.fake()
      });

      it("should resolve", () =>
        handler(msg).should.eventually.equal(undefined));
    });

    describe("error handling", () => {
      describe("init rejects with error", () => {
        const handler = events({
          type: t.any,
          init: sinon.stub().rejects(),
          event: sinon.fake()
        });

        it("should be rejected with error", () =>
          handler(msg).should.be.rejectedWith(Error));
      });

      describe("event rejects with error", () => {
        const handler = events({
          type: t.any,
          init: () => ({}),
          event: sinon.stub().rejects()
        });

        it("should be rejected with error", () =>
          handler(msg).should.be.rejectedWith(Error));
      });

      describe("type decoder fails to decode message body", () => {
        const handler = events({
          type: t.string,
          init: () => ({}),
          event: sinon.fake()
        });

        it("should be rejected with error", () =>
          handler(msg).should.be.rejectedWith(Error));
      });
    });
  });

  describe("event callback style", () => {
    const testFunc = sinon.stub().resolves({});
    const handler = events({
      type: t.any,
      init: () => ({}),
      events: {
        test: testFunc
      }
    });

    describe("unknown event", () => {
      it("should be rejected", () =>
        handler({
          headers: {},
          body: { event: "wrong" }
        }).should.be.rejectedWith());

      it("should not call 'test'", () => testFunc.called.should.be.false);
    });

    describe("'test' event", () => {
      it("should resolve", () =>
        handler({
          headers: {},
          body: { event: "test" }
        }).should.eventually.deep.equal({}));

      it("should call 'test'", () => testFunc.called.should.be.true);
    });
  });
});
