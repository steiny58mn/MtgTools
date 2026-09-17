namespace MtgToolsApi.DataLayer;

public static class SqlQueries
{
    public const string SelectCardsFromList = "SELECT cardid, name, printedname, type, colors, coloridentity, isgamechanger " +
                                              "FROM cards " +
                                              "WHERE name in ({0}) " +
                                              "OR printedname in ({0})";

    public const string TruncateTable = "DELETE FROM {0}";

    public const string SelecttUniqueArtworkBulkData = "SELECT updatedat " +
                                                       "FROM bulkdata " +
                                                       "WHERE type = 'unique_artwork'";

}