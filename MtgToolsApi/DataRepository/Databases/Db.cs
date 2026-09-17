using Bunny.LibSql.Client;

namespace MtgToolsApi.DataRepository.Databases;

public class Db(LibSqlClient client) : LibSqlDbContext(client)
{
    public Db(string dbUrl, string accessKey)
        : this(new LibSqlClient(dbUrl, accessKey)) {}

    public LibSqlTable<Models.Card>? Cards { get; set; }
    public LibSqlTable<Models.BulkData>? BulkData { get; set; }
    public LibSqlTable<Models.Logs>? Logs { get; set; }
}