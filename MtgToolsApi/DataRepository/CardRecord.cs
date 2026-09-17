namespace MtgToolsApi.DataRepository;

public class CardRecord
{
    public string Name = string.Empty;
    public string Type = string.Empty;
    public int Qty;
    public bool IsSideboard;
    public string Colors = string.Empty;
    public string?[] ColorIdentity = [];
    public bool IsGameChanger { get; set; }
}
public class BulkDataRecord
{
    public string Name = string.Empty;
    public string Type = string.Empty;
    public int Qty;
    public bool IsSideboard;
    public string Colors = string.Empty;
    public string?[] ColorIdentity = [];
    public bool IsGameChanger { get; set; }
}