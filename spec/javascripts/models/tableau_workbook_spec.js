describe("chorus.models.TableauWorkbook", function () {
    beforeEach(function () {
        this.model = new chorus.models.TableauWorkbook({dataset: rspecFixtures.dataset({id: '42'})});
    });

    it("has the correct url", function () {
        expect(this.model.url()).toBe("/datasets/42/tableau_workbook");
    })
});
